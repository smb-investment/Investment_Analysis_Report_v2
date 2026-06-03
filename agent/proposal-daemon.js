#!/usr/bin/env node
/**
 * proposal-daemon.js
 * 투자요청서 생성 데몬 — 45초 polling
 * Usage: node --env-file=agent/.env.proposal agent/proposal-daemon.js
 * Windows 자동시작: install-proposal-daemon.bat
 */

import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "child_process";
import { writeFileSync, appendFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOG = join(__dirname, "proposal-daemon.log");
const PID = join(__dirname, "proposal-daemon.pid");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  console.error("   Run: node --env-file=agent/.env.proposal agent/proposal-daemon.js");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  appendFileSync(LOG, line);
  process.stdout.write(line);
}

// PID 기록
writeFileSync(PID, String(process.pid));
log(`proposal-daemon started (pid=${process.pid})`);

let busy = false;

async function poll() {
  if (busy) return;

  const { data, error } = await supabase
    .from("proposals")
    .select("id, company_name, project_name")
    .eq("status", "generating")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) { log(`poll error: ${error.message}`); return; }
  if (!data) return;

  busy = true;
  log(`▶ generating proposal ${data.id} (${data.company_name})`);

  const result = spawnSync(
    "node",
    ["--env-file=agent/.env.proposal", "agent/generate-proposal.js", data.id],
    { cwd: ROOT, stdio: "inherit", timeout: 30 * 60 * 1000 }
  );

  if (result.status === 0) {
    log(`✅ proposal ${data.id} done`);
  } else {
    log(`❌ proposal ${data.id} failed (exit=${result.status})`);
    await supabase
      .from("proposals")
      .update({ status: "input", error_message: `Agent exit ${result.status}` })
      .eq("id", data.id);
  }
  busy = false;
}

setInterval(poll, 45_000);
poll(); // 즉시 1회
log("polling every 45s for status=generating...");
