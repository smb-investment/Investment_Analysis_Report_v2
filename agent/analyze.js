#!/usr/bin/env node
// 실행: npm run analyze   (또는  node --env-file=.env analyze.js [<reportId>])
//
// 흐름:
//   1) pull.js — analyzing 1건 다운로드 (id 미지정 시 가장 오래된 1건)
//   2) claude -p (headless, --permission-mode acceptEdits) — agent/prompts/analyze.md 를 prompt 로 사용해 report.md 작성
//   3) push.js <id> --web-search — Supabase Storage 업로드 + status=draft
//
// 요구:
//   - claude CLI 설치 (Claude Code Max 구독 로그인됨) — API 키 불필요
//   - agent/.env 의 SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const argId = process.argv[2];
const here = __dirname;
const inboxDir = path.join(here, "inbox");

function run(cmd, args, opts = {}) {
  console.log(`\n▶ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });
  if (r.status !== 0) {
    throw new Error(`${cmd} exited with ${r.status}`);
  }
}

function runCapture(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32", ...opts });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function findReportIdFromInbox() {
  if (!fs.existsSync(inboxDir)) return null;
  const dirs = fs.readdirSync(inboxDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^[0-9a-f-]{36}$/i.test(d.name))
    .map((d) => {
      const metaPath = path.join(inboxDir, d.name, "meta.json");
      const mtime = fs.existsSync(metaPath) ? fs.statSync(metaPath).mtimeMs : 0;
      return { id: d.name, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return dirs[0]?.id ?? null;
}

function loadPromptTemplate({ reportId, company, period, sections }) {
  const tplPath = path.join(here, "prompts", "analyze.md");
  let tmpl = fs.readFileSync(tplPath, "utf8");
  tmpl = tmpl
    .replace(/\{\{reportId\}\}/g, reportId)
    .replace(/\{\{company\}\}/g, company || "(미상)")
    .replace(/\{\{period\}\}/g, period || "(미상)")
    .replace(/\{\{sections\}\}/g, sections.map((s) => `§${s}`).join(", "));
  return tmpl;
}

(async () => {
  const pullArgs = ["--env-file=.env", "pull.js"];
  if (argId) pullArgs.push(argId);
  run("node", pullArgs, { cwd: here });

  // pull 후 가장 최근 inbox 디렉토리에서 reportId 확인
  const reportId = argId || findReportIdFromInbox();
  if (!reportId) throw new Error("inbox 에 보고서 디렉토리를 찾을 수 없습니다.");

  const metaPath = path.join(inboxDir, reportId, "meta.json");
  if (!fs.existsSync(metaPath)) throw new Error(`meta.json 이 없습니다: ${metaPath}`);
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const sections = Array.isArray(meta.selected_sections) && meta.selected_sections.length > 0
    ? meta.selected_sections.map(String)
    : ["1","2","3","4","5","6","7","8","9"];

  console.log("");
  console.log(`Report: id=${reportId}  company=${meta.company}  period=${meta.period}`);
  console.log(`Sections: ${sections.map((s) => "§" + s).join(", ")}`);

  // claude headless 분석
  const prompt = loadPromptTemplate({
    reportId,
    company: meta.company,
    period: meta.period,
    sections,
  });
  // 디스크 파일로 prompt 저장 (긴 prompt 의 stdin 안전)
  const promptFile = path.join(inboxDir, reportId, "_prompt.txt");
  fs.writeFileSync(promptFile, prompt, "utf8");

  console.log("\n▶ claude -p (headless) — 분석 시작. 30~60분 소요 예상");
  // 프로젝트 루트(agent 의 부모)를 CWD 로 — Claude 가 CLAUDE.md 자동 인식
  const projectRoot = path.resolve(here, "..");
  // Windows 에서 큰 prompt 를 인자로 넘기면 명령행 길이 제한에 걸릴 수 있어,
  // 단순 prompt: "agent/inbox/<id>/_prompt.txt 의 지시대로 작업해줘" 만 인자로 전달하고,
  // 실제 본문은 claude 의 Read tool 로 읽게 한다.
  const briefPrompt = `agent/inbox/${reportId}/_prompt.txt 의 지시대로 작업해줘. 작업 시작 전에 그 파일을 먼저 읽어. 모든 지시를 그대로 따른다.`;
  const r = spawnSync("claude", [
    "-p", briefPrompt,
    "--model", "claude-sonnet-4-6",
    "--permission-mode", "acceptEdits",
    "--output-format", "text",
    "--add-dir", here, // agent 디렉토리 접근 허용
  ], { stdio: "inherit", shell: process.platform === "win32", cwd: projectRoot });
  if (r.status !== 0) throw new Error(`claude exited with ${r.status}`);

  // push
  console.log("\n▶ push.js");
  run("node", ["--env-file=.env", "push.js", reportId, "--web-search"], { cwd: here });

  // 정리
  try { fs.unlinkSync(promptFile); } catch {}

  console.log("");
  console.log("✅ analyze 완료");
  console.log(`   reportId: ${reportId}`);
  console.log(`   사이트:   https://investment-analysis-report.vercel.app/admin/reports/${reportId}`);
})().catch((err) => {
  console.error("\nERROR:", err.message);
  process.exit(1);
});
