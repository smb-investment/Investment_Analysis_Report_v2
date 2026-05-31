#!/usr/bin/env node
// Scan the working tree for accidentally-committed secrets BEFORE pushing to GitHub.
// Flags:
//  - JWTs whose decoded payload role === "service_role"  (Supabase service_role key)
//  - Anthropic API keys (sk-ant-...)
//  - Any "service_role" string in files that will be tracked by git
// Skips: node_modules, .next, .git, .vercel, .env*, binary assets
// Exit code: 0 if clean, 1 if a secret is found.

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, extname, relative, sep } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", "out", "dist", "build"]);
const SKIP_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".pdf", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mov", ".zip"]);

// .env / .env.* are gitignored — scanning them is informational only (won't fail).
function isEnvFile(rel) {
  const base = rel.split(/[\\/]/).pop() ?? "";
  return base === ".env" || base.startsWith(".env.");
}

const JWT_RE = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const ANTHROPIC_RE = /sk-ant-[A-Za-z0-9_\-]{20,}/g;

const findings = [];

function decodePayload(jwt) {
  try {
    const payload = jwt.split(".")[1];
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (st.isFile()) yield full;
  }
}

let scanned = 0;
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  const ext = extname(file).toLowerCase();
  if (SKIP_EXT.has(ext)) continue;
  if (rel.split(sep).some((p) => SKIP_DIRS.has(p))) continue;

  let buf;
  try { buf = readFileSync(file); } catch { continue; }
  if (buf.length > 5 * 1024 * 1024) continue; // skip files > 5MB
  const text = buf.toString("utf8");
  scanned++;

  const env = isEnvFile(rel);

  for (const m of text.matchAll(JWT_RE)) {
    const payload = decodePayload(m[0]);
    if (payload?.role === "service_role") {
      findings.push({ file: rel, kind: "supabase.service_role JWT", env, sample: m[0].slice(0, 20) + "…" });
    }
  }
  for (const m of text.matchAll(ANTHROPIC_RE)) {
    findings.push({ file: rel, kind: "Anthropic API key (sk-ant-…)", env, sample: m[0].slice(0, 14) + "…" });
  }
  if (/service_role/.test(text) && !env && !rel.includes("scan-secrets") && !rel.endsWith(".sql") && !rel.includes("supabase/schema.sql")) {
    // Comments may legitimately mention the literal string; flag for review.
    findings.push({ file: rel, kind: "literal 'service_role' string (review)", env, sample: "" });
  }
}

const hard = findings.filter((f) => !f.env && !f.kind.endsWith("(review)"));
const soft = findings.filter((f) => f.kind.endsWith("(review)"));
const envFindings = findings.filter((f) => f.env);

console.log(`scanned ${scanned} text files`);
if (envFindings.length) {
  console.log("\nℹ️  In .env* files (gitignored — not pushed):");
  for (const f of envFindings) console.log(`  ${f.file}  [${f.kind}]`);
}
if (soft.length) {
  console.log("\n⚠️  Mentions of 'service_role' (review):");
  for (const f of soft) console.log(`  ${f.file}`);
}
if (hard.length) {
  console.log("\n❌ SECRETS FOUND IN TRACKED FILES:");
  for (const f of hard) console.log(`  ${f.file}  [${f.kind}]  ${f.sample}`);
  process.exit(1);
}
console.log("\n✅ No secrets in tracked files.");
