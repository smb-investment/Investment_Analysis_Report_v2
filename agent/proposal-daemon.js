#!/usr/bin/env node
/**
 * proposal-daemon.js  — 5-Phase Pipeline Daemon
 *
 * - Supabase Realtime 구독: analyzing|generating 변경 즉시 반응
 * - Polling 45s 폴백: Realtime 미수신 시 보완
 * - Heartbeat: 45초마다 daemon_heartbeat 테이블 갱신 (어드민 생존확인용)
 */

import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PID  = join(__dirname, "proposal-daemon.pid");

const SUPABASE_URL           = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { params: { eventsPerSecond: 2 } },
});

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
}

writeFileSync(PID, String(process.pid));
log(`proposal-daemon started (pid=${process.pid})`);

let busy = false;

// ── 핵심: job 처리 ────────────────────────────────────────────────────

async function pickJob() {
  for (const status of ["analyzing", "generating"]) {
    const { data } = await supabase
      .from("proposals")
      .select("id, company_name, status")
      .eq("status", status)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

async function processJob(job) {
  if (busy) { log(`⏸ 처리중 — ${job.id} 대기`); return; }
  busy = true;

  const phase = job.status === "analyzing" ? "analyze" : "generate";
  log(`▶ [${phase}] ${job.id} (${job.company_name})`);

  const exitCode = await new Promise((resolve) => {
    const child = spawn(
      "node",
      ["--env-file=agent/.env.proposal", "agent/generate-proposal.js", job.id, phase],
      { cwd: ROOT, stdio: "pipe" }
    );

    // 출력을 그대로 데몬 stdout/stderr로 전달 (파일 로그 유지)
    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));

    const timer = setTimeout(() => {
      log(`⏱ timeout (40m): killing ${job.id}`);
      child.kill("SIGKILL");
      resolve(1);
    }, 40 * 60 * 1000);

    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code ?? 1);
    });

    child.on("error", (err) => {
      log(`❌ spawn error: ${err.message}`);
      clearTimeout(timer);
      resolve(1);
    });
  });

  if (exitCode === 0) {
    log(`✅ [${phase}] ${job.id} done`);
  } else {
    log(`❌ [${phase}] ${job.id} failed (exit=${exitCode})`);
    if (exitCode === 1) {
      // 상태는 generate-proposal.js가 이미 DB에 업데이트함
    }
  }

  busy = false;

  // 처리 후 대기 중인 job이 있으면 즉시 처리
  const next = await pickJob();
  if (next) processJob(next);
}

// ── Realtime 구독: 버튼 클릭 즉시 감지 ──────────────────────────────

function subscribeRealtime() {
  supabase
    .channel("proposals-pipeline")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "proposals" },
      async (payload) => {
        const status = payload.new?.status;
        if (status === "analyzing" || status === "generating") {
          log(`🔔 Realtime: ${status} → ${payload.new.id}`);
          const job = {
            id: payload.new.id,
            company_name: payload.new.company_name,
            status,
          };
          processJob(job);
        }
      }
    )
    .subscribe((state) => {
      log(`Realtime: ${state}`);
    });
}

// ── Heartbeat: 45초마다 생존 신호 ─────────────────────────────────────

async function heartbeat() {
  try {
    await supabase.from("daemon_heartbeat").upsert({
      id: "proposal-daemon",
      last_seen: new Date().toISOString(),
      pid: process.pid,
      version: "v2",
    });
  } catch (e) {
    log(`heartbeat error: ${e.message}`);
  }
}

// ── Polling 폴백: Realtime 누락 보완 ──────────────────────────────────

async function poll() {
  await heartbeat();
  if (busy) return;
  const job = await pickJob();
  if (job) processJob(job);
}

// ── 시작 ─────────────────────────────────────────────────────────────

subscribeRealtime();
setInterval(poll, 45_000);
poll(); // 즉시 1회

log("✅ Realtime 구독 + polling 45s 시작");
