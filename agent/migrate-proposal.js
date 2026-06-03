#!/usr/bin/env node
/**
 * migrate-proposal.js
 * 새 Supabase 프로젝트(투자요청서)에 마이그레이션 적용
 * Usage: node --env-file=.env.proposal agent/migrate-proposal.js
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL not set in .env.proposal");
  console.error("   Format: postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log("✅ Connected to Supabase DB");

  const sql = readFileSync(
    join(__dirname, "../supabase/migrations/2026-06-03_proposals.sql"),
    "utf8"
  );

  await client.query(sql);
  console.log("✅ Migration applied: proposals schema");
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
