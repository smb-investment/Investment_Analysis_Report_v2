#!/usr/bin/env node
/**
 * migrate-proposal.js
 * supabase/migrations/ 의 모든 .sql 파일을 순서대로 실행
 * Usage: node --env-file=agent/.env.proposal agent/migrate-proposal.js
 *
 * DB 직접 연결 불가(IPv6 전용 네트워크 등)이면 SQL을 화면에 출력합니다.
 * → Supabase Dashboard > SQL Editor 에 붙여넣어 실행하세요.
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "../supabase/migrations");

const dbUrl = process.env.SUPABASE_DB_URL;

const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith(".sql")).sort();

async function runViaDB() {
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  console.log("✅ DB 연결 성공\n");

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    try {
      await client.query(sql);
      console.log(`✅ ${file}`);
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log(`⏭  ${file} (이미 적용됨, 스킵)`);
      } else {
        console.error(`❌ ${file} 실패: ${err.message}`);
        await client.end();
        process.exit(1);
      }
    }
  }
  await client.end();
  console.log("\n✅ 모든 마이그레이션 완료");
}

function printSqlFallback() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚠️  DB 직접 연결 불가 (IPv6 전용 / 방화벽)");
  console.log("");
  console.log("아래 SQL을 복사해서 Supabase Dashboard > SQL Editor 에 실행하세요:");
  console.log("https://supabase.com/dashboard/project/zvvbzmndemrwdcfjewog/sql/new");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    console.log(`-- ===== ${file} =====`);
    console.log(sql);
    console.log("");
  }
}

if (!dbUrl) {
  console.warn("⚠️  SUPABASE_DB_URL 미설정 — SQL 출력 모드\n");
  printSqlFallback();
} else {
  try {
    await runViaDB();
  } catch (err) {
    console.warn(`⚠️  DB 연결 실패: ${err.message}\n`);
    printSqlFallback();
  }
}
