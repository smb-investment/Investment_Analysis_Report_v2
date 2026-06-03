#!/usr/bin/env node
/**
 * generate-proposal.js  — 5-Phase Quality-Controlled Pipeline
 *
 * Phase 1 (analyzing):  PDF 완전 추출 → extraction.json
 * Phase 2 (analyzing):  슬라이드 기획안 → plan.md  → status=planning
 * Phase 3 (generating): 기획안 기반 작성 → MD + slides.json
 * Phase 4 (generating): QA 채점 → qa_report.json  (실패 시 재작성 최대 2회)
 * Phase 5 (generating): PPTX + HTML 빌드 → Storage 업로드 → status=ready
 *
 * Usage:
 *   node --env-file=agent/.env.proposal agent/generate-proposal.js <proposalId> <phase>
 *   phase: "analyze" | "generate"
 */

import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");
const INBOX     = join(__dirname, "proposal-inbox");
const PROMPTS   = join(__dirname, "prompts");

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error("env not set"); process.exit(1); }

const supabase     = createClient(SUPABASE_URL, SERVICE_KEY);
const proposalId   = process.argv[2];
const phaseArg     = process.argv[3] ?? "analyze"; // "analyze" | "generate"
if (!proposalId) { console.error("Usage: generate-proposal.js <proposalId> <phase>"); process.exit(1); }

const workDir = join(INBOX, proposalId);
mkdirSync(join(workDir, "attachments"), { recursive: true });

// ── helpers ──────────────────────────────────────────────────────────────

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function runClaude(promptFile, label, timeoutMs = 20 * 60 * 1000) {
  // 역슬래시 → 슬래시 변환 (Claude Read tool 경로 호환)
  const promptRelPath = promptFile
    .replace(ROOT + "/", "")
    .replace(ROOT + "\\", "")
    .replace(/\\/g, "/");
  // 명확한 실행 지시 — 설명 응답 방지
  const brief = [
    `[EXECUTE NOW] Read file: ${promptRelPath}`,
    `Then immediately execute ALL steps in that file using your tools.`,
    `Use Write tool to create ALL output files specified. Do NOT describe or summarize — just execute.`,
  ].join(" ");
  log(`▶ Claude [${label}] 시작...`);
  const r = spawnSync(
    "claude",
    ["-p", brief,
     "--permission-mode", "acceptEdits",
     "--add-dir", workDir,
     "--add-dir", __dirname],
    { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32", timeout: timeoutMs }
  );
  if (r.error)       { log(`❌ [${label}] spawn error: ${r.error.message}`); return false; }
  if (r.status !== 0){ log(`❌ [${label}] exit=${r.status}`); return false; }
  log(`✅ [${label}] 완료`);
  return true;
}

function fillPrompt(templateFile, vars) {
  let tpl = readFileSync(templateFile, "utf8");
  for (const [k, v] of Object.entries(vars)) tpl = tpl.replaceAll(`{{${k}}}`, v);
  return tpl;
}

async function setStatus(status, extra = {}) {
  await supabase.from("proposals").update({ status, ...extra }).eq("id", proposalId);
  log(`→ status: ${status}`);
}

async function loadProposal() {
  const { data, error } = await supabase.from("proposals").select("*").eq("id", proposalId).single();
  if (error || !data) { log("❌ proposal not found"); process.exit(1); }
  return data;
}

async function downloadAttachments(proposal) {
  const attachments = Array.isArray(proposal.source_attachments) ? proposal.source_attachments : [];
  for (const path of attachments) {
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("proposals-attachments").download(path);
    if (dlErr) { log(`⚠️ skip ${path}: ${dlErr.message}`); continue; }
    const buf = Buffer.from(await fileData.arrayBuffer());
    const fileName = path.split("/").pop();
    writeFileSync(join(workDir, "attachments", fileName), buf);
    log(`  ↓ ${fileName}`);
  }
}

// ── QA 파싱 & 재작성 ───────────────────────────────────────────────────

function parseQaReport() {
  const p = join(workDir, "qa_report.json");
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

function buildFixPrompt(qaReport, proposal) {
  const failed = qaReport.failed_slides ?? [];
  if (!failed.length) return null;

  const fixes = failed.map(key => {
    const s = qaReport.slides[key];
    return `### ${key} (점수: ${s.score}/100)\n문제: ${s.issues.join(", ")}\n수정 지시: ${s.fix_instructions}`;
  }).join("\n\n");

  const content = `# 투자요청서 재작성 지시

당신은 투자요청서 QA 수정 전문가입니다.
아래 불합격 슬라이드만 targeted 수정합니다.

## 절대 규칙
- extraction.json에 없는 수치 생성 금지
- 합격 슬라이드는 절대 변경하지 않음
- slides.json의 chart_data.value는 반드시 number

## 작업 디렉토리
${workDir}

## 수정 대상 슬라이드
${fixes}

## 수정 후
slides.json과 MD 파일을 수정된 내용으로 업데이트하세요.
완료 후: "✅ 재작성 완료 — 수정된 슬라이드: ${failed.join(", ")}"
`;
  const fixFile = join(workDir, "_fix_prompt.txt");
  writeFileSync(fixFile, content, "utf8");
  return fixFile;
}

// ── Phase A: ANALYZE (input → analyzing → planning) ───────────────────

async function runAnalyze() {
  const proposal = await loadProposal();
  writeFileSync(join(workDir, "meta.json"), JSON.stringify(proposal, null, 2));
  log(`✅ Loaded: ${proposal.company_name}`);

  await downloadAttachments(proposal);

  const today = new Date().toISOString().slice(0, 10);
  const vars = { company: proposal.company_name, workDir, today, proposalId };

  // P1: Extract
  const extractPrompt = join(workDir, "_extract_prompt.txt");
  writeFileSync(extractPrompt, fillPrompt(join(PROMPTS, "extract.md"), vars), "utf8");
  const extractOk = runClaude(extractPrompt, "P1:Extract", 20 * 60 * 1000);
  if (!extractOk || !existsSync(join(workDir, "extraction.json"))) {
    await setStatus("input", { error_message: "P1 Extract 실패: extraction.json 미생성" });
    process.exit(1);
  }

  // P2: Plan
  const planPrompt = join(workDir, "_plan_prompt.txt");
  writeFileSync(planPrompt, fillPrompt(join(PROMPTS, "plan.md"), vars), "utf8");
  const planOk = runClaude(planPrompt, "P2:Plan", 15 * 60 * 1000);
  if (!planOk || !existsSync(join(workDir, "plan.md"))) {
    await setStatus("input", { error_message: "P2 Plan 실패: plan.md 미생성" });
    process.exit(1);
  }

  // plan.md 내용을 DB에 저장 → 사이트에서 표시
  const planMd = readFileSync(join(workDir, "plan.md"), "utf8");
  const extractionJson = readFileSync(join(workDir, "extraction.json"), "utf8");
  await setStatus("planning", {
    plan_md: planMd,
    extraction_json: extractionJson,
    error_message: null,
  });
  log("✅ 기획안 완료 → 사이트에서 검토 후 승인하세요");
}

// ── Phase B: GENERATE (planning → generating → ready) ─────────────────

async function runGenerate() {
  const proposal = await loadProposal();
  writeFileSync(join(workDir, "meta.json"), JSON.stringify(proposal, null, 2));

  // plan.md, extraction.json 복원 (DB → 파일)
  if (proposal.plan_md)        writeFileSync(join(workDir, "plan.md"), proposal.plan_md, "utf8");
  if (proposal.extraction_json) writeFileSync(join(workDir, "extraction.json"), proposal.extraction_json, "utf8");

  await downloadAttachments(proposal);

  const today = new Date().toISOString().slice(0, 10);
  const vars = { company: proposal.company_name, workDir, today, proposalId };
  const mdFileName = `${proposal.company_name}_Investment_Proposal.md`;

  // P3: Write
  const writePrompt = join(workDir, "_write_prompt.txt");
  writeFileSync(writePrompt, fillPrompt(join(PROMPTS, "write.md"), vars), "utf8");
  const writeOk = runClaude(writePrompt, "P3:Write", 25 * 60 * 1000);
  if (!writeOk || !existsSync(join(workDir, "slides.json"))) {
    await setStatus("planning", { error_message: "P3 Write 실패: slides.json 미생성" });
    process.exit(1);
  }

  // P4: QA + 재작성 (최대 2회)
  let qaPass = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const qaPrompt = join(workDir, `_qa_prompt_${attempt}.txt`);
    writeFileSync(qaPrompt, fillPrompt(join(PROMPTS, "qa.md"), vars), "utf8");
    const qaOk = runClaude(qaPrompt, `P4:QA(${attempt})`, 10 * 60 * 1000);

    const qaReport = parseQaReport();
    if (!qaReport) {
      log(`⚠️ QA ${attempt}회차: qa_report.json 파싱 실패 — 계속 진행`);
      break;
    }

    log(`QA 점수: ${qaReport.overall_score}점 / ${qaReport.overall_pass ? "PASS" : "FAIL"} / 불합격 ${(qaReport.failed_slides ?? []).length}개`);

    if (qaReport.overall_pass) { qaPass = true; break; }

    if (attempt < 3) {
      const fixFile = buildFixPrompt(qaReport, proposal);
      if (!fixFile) { log("재작성 대상 없음 — QA 통과 처리"); qaPass = true; break; }
      const fixOk = runClaude(fixFile, `P4:Fix(${attempt})`, 15 * 60 * 1000);
      if (!fixOk) { log(`⚠️ Fix ${attempt}회차 실패 — 다음 QA 시도`); }
    } else {
      log(`⚠️ QA 3회 후 미통과 — human_review 플래그로 계속 진행`);
    }
  }

  const finalQa = parseQaReport();

  // P5: Build
  const pptxPath = join(workDir, "proposal.pptx");
  const mdPath   = join(workDir, mdFileName);
  const htmlPath = join(workDir, "proposal.html");

  const buildResult = spawnSync(
    "node",
    [join(__dirname, "build-pptx.js"), join(workDir, "slides.json"), pptxPath],
    { cwd: ROOT, stdio: "inherit", timeout: 5 * 60 * 1000 }
  );
  if (buildResult.status !== 0) {
    await setStatus("planning", { error_message: "P5 PPTX 빌드 실패" });
    process.exit(1);
  }
  log("✅ PPTX built");

  if (existsSync(mdPath)) {
    const mdContent = readFileSync(mdPath, "utf8");
    writeFileSync(htmlPath, buildHtml(mdContent, proposal.company_name), "utf8");
    log("✅ HTML generated");
  }

  // Upload
  const pptxStoragePath = `${proposalId}/proposal.pptx`;
  const { error: upPptxErr } = await supabase.storage
    .from("proposals-pptx").upload(pptxStoragePath, readFileSync(pptxPath), {
      contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      upsert: true,
    });
  if (upPptxErr) { log(`❌ PPTX upload failed: ${upPptxErr.message}`); process.exit(1); }
  log("✅ PPTX uploaded");

  let mdStoragePath = null;
  if (existsSync(mdPath)) {
    mdStoragePath = `${proposalId}/${mdFileName}`;
    const { error: upMdErr } = await supabase.storage
      .from("proposals-md").upload(mdStoragePath, readFileSync(mdPath), {
        contentType: "text/markdown; charset=utf-8", upsert: true,
      });
    if (upMdErr) log(`⚠️ MD upload failed: ${upMdErr.message}`);
    else log("✅ MD uploaded");
  }

  let htmlStoragePath = null;
  if (existsSync(htmlPath)) {
    htmlStoragePath = `${proposalId}/proposal.html`;
    const { error: upHtmlErr } = await supabase.storage
      .from("proposals-html").upload(htmlStoragePath, readFileSync(htmlPath), {
        contentType: "text/html; charset=utf-8", upsert: true,
      });
    if (upHtmlErr) log(`⚠️ HTML upload failed: ${upHtmlErr.message}`);
    else log("✅ HTML uploaded");
  }

  await setStatus("ready", {
    pptx_path: pptxStoragePath,
    md_path: mdStoragePath,
    html_path: htmlStoragePath,
    qa_report: finalQa,
    qa_passed: finalQa?.overall_pass ?? null,
    model_used: "claude-code",
    error_message: null,
  });

  log(`✅ Done — proposal ${proposalId} status=ready / QA: ${finalQa?.overall_score ?? "?"}점`);
}

// ── Entry ────────────────────────────────────────────────────────────────

if (phaseArg === "analyze") {
  await runAnalyze();
} else if (phaseArg === "generate") {
  await runGenerate();
} else {
  console.error(`Unknown phase: ${phaseArg}. Use "analyze" or "generate"`);
  process.exit(1);
}

// ── HTML Builder ─────────────────────────────────────────────────────────
function buildHtml(md, companyName) {
  const body = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^# (.+)$/gm, "</p><h1>$1</h1><p>")
    .replace(/^## (.+)$/gm, "</p><h2>$1</h2><p>")
    .replace(/^### (.+)$/gm, "</p><h3>$1</h3><p>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/^/, "<p>").replace(/$/, "</p>");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${companyName} Investment Proposal</title>
<style>
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Pretendard','Noto Sans KR',sans-serif;font-size:12pt;color:#2D3748;background:#fff;line-height:1.7}
  @page{size:A4 landscape;margin:1.5cm}
  .page{max-width:297mm;margin:0 auto;padding:2cm 2cm 1.5cm}
  h1{font-size:22pt;color:#5B7FA6;border-bottom:2px solid #E2E8F0;padding-bottom:10px;margin:28px 0 16px}
  h2{font-size:16pt;color:#fff;background:#5B7FA6;padding:8px 14px;margin:24px 0 12px;border-radius:4px}
  h3{font-size:13pt;color:#2D3748;border-left:3px solid #A8B9D4;padding-left:10px;margin:16px 0 8px}
  p{margin-bottom:10px}
  ul{margin:8px 0 12px 24px}
  li{margin-bottom:5px}
  strong{color:#5B7FA6;font-weight:600}
  table{width:100%;border-collapse:collapse;margin:16px 0;font-size:11pt}
  th{background:#5B7FA6;color:#fff;padding:8px 12px;text-align:left}
  td{padding:8px 12px;border-bottom:1px solid #E2E8F0}
  tr:nth-child(even){background:#F8FAFC}
  .footer{margin-top:40px;padding-top:12px;border-top:1px solid #E2E8F0;font-size:9pt;color:#718096;text-align:center}
</style>
</head>
<body>
<div class="page">
${body}
<div class="footer">본 자료는 정보 제공 목적이며 투자자문·권유가 아닙니다. 투자 판단과 책임은 이용자 본인에게 있습니다. | SMB투자파트너스</div>
</div>
</body>
</html>`;
}
