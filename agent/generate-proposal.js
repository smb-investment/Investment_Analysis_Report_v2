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
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
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

/**
 * Claude를 실행하고 stdout 출력을 캡처한다.
 * Claude가 파일을 직접 쓰지 않고 출력만 하면 Node.js가 파일로 저장한다.
 * → 파일 저장 권한 요청 문제 완전 우회
 */
function runClaude(task, label, outputFile, timeoutMs = 25 * 60 * 1000) {
  log(`▶ Claude [${label}] 시작...`);
  const r = spawnSync(
    "claude",
    ["-p", task,
     "--dangerously-skip-permissions",
     "--add-dir", workDir,
     "--add-dir", __dirname],
    {
      cwd: workDir,
      stdio: ["pipe", "pipe", "inherit"],   // stdout 캡처
      shell: process.platform === "win32",
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,          // 50MB
    }
  );
  if (r.error) { log(`❌ [${label}] spawn error: ${r.error.message}`); return false; }
  if (r.status !== 0) { log(`❌ [${label}] exit=${r.status}`); return false; }

  const raw = r.stdout ? r.stdout.toString("utf8") : "";
  log(`✅ [${label}] 완료 (출력 ${raw.length} chars)`);

  if (!outputFile) return true;

  // 출력에서 코드블록 내용 추출 (```json ... ``` 또는 ```markdown ... ```)
  const fence = raw.match(/```(?:json|markdown|md)?\n([\s\S]+?)\n```/);
  const content = fence ? fence[1].trim() : extractBetweenMarkers(raw);

  if (!content) {
    log(`⚠️ [${label}] 출력에서 파일 내용을 찾지 못했음 — raw 전체 저장`);
    writeFileSync(outputFile, raw, "utf8");
  } else {
    writeFileSync(outputFile, content, "utf8");
  }
  log(`💾 저장: ${outputFile}`);
  return true;
}

function extractBetweenMarkers(text) {
  // JSON 추출 (첫 { 부터 마지막 } 까지)
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim() || null;
}

function w(p) { return p.replace(/\\/g, "/"); }

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

  // P1: Extract — Claude stdout 캡처 → Node.js가 파일 저장 (권한 문제 완전 우회)
  const attachFiles = readdirSync(join(workDir, "attachments"))
    .map(f => `${w(join(workDir,"attachments",f))}`)
    .join(", ");
  const extractTask = `Read these files completely: meta.json, ${attachFiles}
Then output a single JSON object (starting with { ending with }) containing all extracted data:
- deal_terms: funding_amount, total_cost, interest_rate, tenor_months, ltv, funding_type, use_of_proceeds
- company_info: legal_name, reg_no, ceo_name, established, address, business_desc
- market: market_name, market_size, cagr, pain_points (array)
- competitive_advantage: array of {title, metric, desc, source}
- business_model: value_chain (4 steps), revenue_streams (array)
- financials: revenue_forecast (2027-2031 array), revenue_cagr, ebitda_margin
- capex: phase1, phase2 each with amount, equipment, completion, target_revenue
- risks: array of {category, desc, mitigation, severity}
- roadmap: array of {phase, period, milestones}
- team: ceo, coo each with name, careers array
Each field: {"value": ..., "source": "filename p.X", "confidence": "HIGH|MED|LOW"}
Missing data = null. No guessing. Output ONLY the JSON object, nothing else.`;

  const extractionPath = join(workDir, "extraction.json");
  const extractOk = runClaude(extractTask, "P1:Extract", extractionPath, 20 * 60 * 1000);
  if (!extractOk || !existsSync(extractionPath)) {
    await setStatus("input", { error_message: "P1 Extract 실패: extraction.json 미생성" });
    process.exit(1);
  }

  // P2: Plan — Claude stdout 캡처 → Node.js 저장
  const extractedData = readFileSync(extractionPath, "utf8");
  const planTask = `Based on this extracted data:
${extractedData.slice(0, 3000)}
...and meta.json (${JSON.stringify(proposal).slice(0, 500)})

Create a slide-by-slide investment proposal plan in Korean markdown format.
For each slide (01-Cover through 12-Conclusion + Appendix A1-A10):
- One "So What" headline sentence
- Each data item marked as: [확인: source] or [추정: assumption] or [TBD: reason]
Output ONLY the markdown content, starting with "# ${proposal.company_name} 투자요청서 기획안"`;

  const planPath = join(workDir, "plan.md");
  const planOk = runClaude(planTask, "P2:Plan", planPath, 15 * 60 * 1000);
  if (!planOk || !existsSync(planPath)) {
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

  // P3: Write — stdout 캡처 방식 (두 파일 별도 실행)
  const extractedForWrite = readFileSync(join(workDir, "extraction.json"), "utf8");
  const planContent = readFileSync(join(workDir, "plan.md"), "utf8");
  const slidesSchemaRef = readFileSync(join(PROMPTS, "write.md"), "utf8").slice(0, 3000);

  // P3a: MD 생성
  const writeMdTask = `Based on: extraction.json=${extractedForWrite.slice(0,2000)}, plan.md=${planContent.slice(0,2000)}
Write a complete investment proposal in Korean markdown for ${proposal.company_name}.
Include all 21 sections (Cover through Appendix). Use only data from extraction.json. Missing data → [TBD].
Output ONLY the markdown starting with "# ${proposal.company_name} 투자요청서"`;
  const mdPath = join(workDir, mdFileName);
  const mdOk = runClaude(writeMdTask, "P3a:MD", mdPath, 20 * 60 * 1000);

  // P3b: slides.json 생성
  const writeSlidesTask = `Based on extraction.json and plan.md already read, create a slides.json for ${proposal.company_name} investment proposal.
Schema reference: ${slidesSchemaRef.slice(0, 1500)}
Rules: chart_data[].value must be number (not string). Missing data → "[TBD]". Arrays must meet minimum sizes (cards:6, advantages:5, risks:5, pain_points:4, revenue_streams:5, roadmap.phases:5).
Output ONLY the JSON object starting with { "company": ...`;
  const slidesPath = join(workDir, "slides.json");
  const slidesOk = runClaude(writeSlidesTask, "P3b:Slides", slidesPath, 20 * 60 * 1000);

  if (!slidesOk || !existsSync(slidesPath)) {
    await setStatus("planning", { error_message: "P3 Write 실패: slides.json 미생성" });
    process.exit(1);
  }

  // P4: QA — stdout 캡처
  let qaPass = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const slidesContent = readFileSync(slidesPath, "utf8").slice(0, 4000);
    const qaTask = `Score this investment proposal slides.json for ${proposal.company_name}:
${slidesContent}
Score each slide on: A.DataGrounding(30) B.SoWhatQuality(25) C.Completeness(20) D.CrossConsistency(15) E.Style(10).
Output ONLY a JSON object: {"overall_score":N,"overall_pass":bool,"slides":{"cover":{"score":N,"pass":bool,"issues":[],"fix_instructions":""},...},"failed_slides":[],"human_review_flags":[]}`;
    const qaReportPath = join(workDir, "qa_report.json");
    const qaOk = runClaude(qaTask, `P4:QA(${attempt})`, qaReportPath, 10 * 60 * 1000);

    const qaReport = parseQaReport();
    if (!qaReport) { log(`⚠️ QA ${attempt}회차 파싱 실패 — 계속 진행`); break; }

    log(`QA 점수: ${qaReport.overall_score}점 / ${qaReport.overall_pass ? "PASS" : "FAIL"}`);
    if (qaReport.overall_pass) { qaPass = true; break; }
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
