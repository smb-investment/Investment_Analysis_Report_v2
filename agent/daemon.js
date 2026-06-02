#!/usr/bin/env node
// 실행: node --env-file=.env daemon.js
// (보통은 PC 시작 시 자동 실행 — install-daemon.bat 으로 등록)
//
// 동작:
//   1) 30초마다 reports 테이블 polling — status='analyzing' 인 보고서 1건 검색
//   2) 발견 시 analyze.js 자식 프로세스로 spawn (pull → claude -p → push)
//   3) 한 번에 1건만 처리 (busy lock — 분석 중에는 다음 polling 무시)
//   4) 모든 로그를 agent/daemon.log 에 append
//   5) SIGINT/SIGTERM 으로 안전 종료
//
// 요구:
//   - agent/.env 의 SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
//   - claude CLI 설치 + Claude Code Max 로그인
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("agent/.env 에 SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(2);
}

const POLL_INTERVAL_MS = 30 * 1000;
const HERE = __dirname;
const LOG_PATH = path.join(HERE, "daemon.log");
const PID_PATH = path.join(HERE, "daemon.pid");

const REST = `${SUPABASE_URL}/rest/v1`;
const H = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
};

// ===== 로깅 =====
function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function log(msg) {
  const line = `[${ts()}] ${msg}\n`;
  try { fs.appendFileSync(LOG_PATH, line, "utf8"); } catch {}
  process.stdout.write(line);
}

// ===== PID 파일 (uninstall 시 사용) =====
try { fs.writeFileSync(PID_PATH, String(process.pid), "utf8"); } catch {}

// ===== 종료 처리 =====
let shuttingDown = false;
function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`shutdown: ${reason}`);
  try { fs.unlinkSync(PID_PATH); } catch {}
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (err) => {
  log(`uncaughtException: ${err.message}\n${err.stack || ""}`);
});
process.on("unhandledRejection", (err) => {
  log(`unhandledRejection: ${err instanceof Error ? err.message : String(err)}`);
});

// ===== Supabase REST: 다음 analyzing 보고서 1건 =====
async function fetchNextAnalyzing() {
  const url = `${REST}/reports?select=id,company,period,selected_sections&status=eq.analyzing&order=created_at.asc&limit=1`;
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(`fetch failed: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0] || null;
}

// ===== analyze.js 자식 프로세스 실행 =====
function runAnalyze(reportId) {
  return new Promise((resolve) => {
    const child = spawn(
      "node",
      ["--env-file=.env", "analyze.js", reportId],
      { cwd: HERE, shell: process.platform === "win32" }
    );
    let buf = "";
    const append = (chunk) => {
      buf += chunk.toString();
      // 줄 단위로 로그
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trimEnd();
        buf = buf.slice(idx + 1);
        if (line) log(`  | ${line}`);
      }
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.on("close", (code) => {
      if (buf.trim()) log(`  | ${buf.trim()}`);
      resolve(code ?? -1);
    });
  });
}

// ===== 메인 폴링 루프 =====
let busy = false;
let polls = 0;
async function tick() {
  if (shuttingDown) return;
  if (busy) return; // 이전 분석 진행 중
  polls += 1;
  try {
    const next = await fetchNextAnalyzing();
    if (!next) {
      if (polls % 20 === 1) log(`idle (analyzing 0건, ${POLL_INTERVAL_MS / 1000}초 간격으로 감시 중)`);
      return;
    }
    busy = true;
    log(`📥 발견: id=${next.id} company=${next.company} period=${next.period}`);
    const sections = Array.isArray(next.selected_sections) && next.selected_sections.length > 0
      ? next.selected_sections.map(String)
      : ["1","2","3","4","5","6","7","8","9"];
    log(`   섹션: §${sections.join(", §")} — analyze.js 시작`);
    const code = await runAnalyze(next.id);
    if (code === 0) {
      log(`✅ 분석 완료: id=${next.id} (draft 로 저장됨)`);
    } else {
      log(`❌ 분석 실패: id=${next.id} (exit ${code}) — 잠시 후 재시도 가능`);
      // 실패 시 status 는 analyzing 그대로 — 다음 polling 에서 다시 잡힘.
      // 무한 재시도 방지를 위해 잠깐 쉬기.
      await new Promise((r) => setTimeout(r, 60 * 1000));
    }
  } catch (err) {
    log(`tick error: ${err.message}`);
  } finally {
    busy = false;
  }
}

// 시작 배너
log("=".repeat(60));
log(`Investment Analysis Daemon 시작 (pid=${process.pid})`);
log(`Supabase: ${SUPABASE_URL}`);
log(`Polling: ${POLL_INTERVAL_MS / 1000}s`);
log("=".repeat(60));

// 첫 폴 + interval
tick();
setInterval(tick, POLL_INTERVAL_MS);
