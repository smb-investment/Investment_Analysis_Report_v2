#!/usr/bin/env node
/**
 * proposal-daemon.js  — 5-Phase Pipeline Daemon
 *
 * Polling 45s:
 *   status=analyzing  → generate-proposal.js <id> analyze  (P1+P2 → planning)
 *   status=generating → generate-proposal.js <id> generate (P3+P4+P5 → ready)
 */

import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "child_process";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOG  = join(__dirname, "proposal-daemon.log");
const PID  = join(__dirname, "proposal-daemon.pid");

const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
}

writeFileSync(PID, String(process.pid));
log(`proposal-daemon started (pid=${process.pid})`);
log("polling every 45s for status=analyzing|generating...");

let busy = false;

async function pickJob() {
  // analyzing 우선, 없으면 generating
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

async function poll() {
  if (busy) return;

  let job;
  try { job = await pickJob(); }
  catch (e) { log(`poll error: ${e.message}`); return; }
  if (!job) return;

  busy = true;
  const phase = job.status === "analyzing" ? "analyze" : "generate";
  log(`▶ [${phase}] ${job.id} (${job.company_name})`);

  const result = spawnSync(
    "node",
    ["--env-file=agent/.env.proposal", "agent/generate-proposal.js", job.id, phase],
    { cwd: ROOT, stdio: "inherit", timeout: 40 * 60 * 1000 }
  );

  if (result.error) {
    log(`❌ spawn error: ${result.error.message}`);
    const rollback = job.status === "analyzing" ? "input" : "planning";
    await supabase.from("proposals")
      .update({ status: rollback, error_message: result.error.message })
      .eq("id", job.id);
  } else if (result.status === 0) {
    log(`✅ [${phase}] ${job.id} done`);
  } else {
    log(`❌ [${phase}] ${job.id} failed (exit=${result.status})`);
  }

  busy = false;
}

setInterval(poll, 45_000);
poll();
