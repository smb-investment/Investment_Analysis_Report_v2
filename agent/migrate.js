#!/usr/bin/env node
// 실행: node --env-file=.env migrate.js [migration-file.sql]
// 기본: supabase/migrations 의 미실행 SQL 파일을 모두 순서대로 적용
// 인수 지정 시: 해당 SQL 파일만 적용
//
// 환경변수 (agent/.env):
//   SUPABASE_URL                  - 예: https://lburflnuxaeobsnzlnlo.supabase.co
//   SUPABASE_DB_PASSWORD          - Supabase Dashboard > Settings > Database > Database password
//   (선택) SUPABASE_DB_URL        - 완전한 connection string (있으면 우선 사용)
//   (선택) SUPABASE_DB_REGION     - 기본 ap-northeast-2 (Seoul) — Pooler 호스트 조립용
//   (선택) SUPABASE_DB_HOST       - 직접 호스트 지정 (Pooler 자동조립 무시)
//   (선택) SUPABASE_DB_PORT       - 기본 5432 (session mode)
//   (선택) SUPABASE_DB_USER       - 기본 postgres.<ref> (pooler 형식)
//
// 적용 기록: public.schema_migrations(filename text primary key, applied_at timestamptz)
"use strict";

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const {
  SUPABASE_URL,
  SUPABASE_DB_PASSWORD,
  SUPABASE_DB_URL,
  SUPABASE_DB_REGION,
  SUPABASE_DB_HOST,
  SUPABASE_DB_PORT,
  SUPABASE_DB_USER,
} = process.env;

if (!SUPABASE_DB_URL && (!SUPABASE_URL || !SUPABASE_DB_PASSWORD)) {
  console.error("agent/.env 에 (SUPABASE_URL + SUPABASE_DB_PASSWORD) 또는 SUPABASE_DB_URL 이 필요합니다.");
  console.error("Supabase Dashboard > Settings > Database > Database password 에서 확인하세요.");
  process.exit(2);
}

function projectRef() {
  const m = (SUPABASE_URL || "").match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (!m) throw new Error(`SUPABASE_URL 에서 project ref 를 추출할 수 없습니다: ${SUPABASE_URL}`);
  return m[1];
}

// 연결 후보 우선순위:
//   1) SUPABASE_DB_URL 통째로 (사용자 직접 입력)
//   2) SUPABASE_DB_HOST 명시 시 그 호스트
//   3) Pooler: aws-0-<region>.pooler.supabase.com:5432 (session mode, IPv4 OK)
//   4) Direct: db.<ref>.supabase.co:5432 (IPv6 only, 보통 실패)
// SUPABASE_DB_URL 이 있고 region 이 명시되지 않은 형식이면 그 host 를 region 후보로도 추가
function regionFromUrl(url) {
  const m = url.match(/aws-0-([a-z0-9-]+)\.pooler\.supabase\.com/);
  return m ? m[1] : null;
}

const REGION_CANDIDATES = [
  "ap-northeast-2", // Seoul
  "ap-northeast-1", // Tokyo
  "ap-southeast-1", // Singapore
  "us-east-1",      // N. Virginia
  "us-west-1",      // N. California
  "eu-central-1",   // Frankfurt
  "eu-west-2",      // London
  "ap-southeast-2", // Sydney
  "ap-south-1",     // Mumbai
];

function buildCandidates() {
  const ref = projectRef();
  const password = SUPABASE_DB_PASSWORD;
  const port = Number(SUPABASE_DB_PORT || 5432);
  const user = SUPABASE_DB_USER || `postgres.${ref}`;
  const cands = [];

  if (SUPABASE_DB_URL) {
    cands.push({ kind: "url", connectionString: SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
    // URL 에 명시된 region 외의 다른 region 들도 fallback 으로 추가
    const seedRegion = regionFromUrl(SUPABASE_DB_URL);
    if (password) {
      for (const region of REGION_CANDIDATES) {
        if (region === seedRegion) continue;
        cands.push({
          kind: `pooler-${region}`,
          host: `aws-0-${region}.pooler.supabase.com`,
          port,
          user,
          password,
          database: "postgres",
          ssl: { rejectUnauthorized: false },
        });
      }
    }
    return cands;
  }

  if (SUPABASE_DB_HOST) {
    cands.push({
      kind: "explicit",
      host: SUPABASE_DB_HOST,
      port,
      user,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
    });
    return cands;
  }

  const startRegion = SUPABASE_DB_REGION || "ap-northeast-2";
  const ordered = [startRegion, ...REGION_CANDIDATES.filter((r) => r !== startRegion)];
  for (const region of ordered) {
    cands.push({
      kind: `pooler-${region}`,
      host: `aws-0-${region}.pooler.supabase.com`,
      port,
      user,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
    });
  }
  cands.push({
    kind: "direct",
    host: `db.${ref}.supabase.co`,
    port,
    user: SUPABASE_DB_USER || "postgres",
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  return cands;
}

async function connectAny() {
  const cands = buildCandidates();
  let lastErr;
  for (const c of cands) {
    const cl = new Client(c);
    const label = c.kind === "url" ? "via SUPABASE_DB_URL" : `${c.user}@${c.host}:${c.port} (${c.kind})`;
    console.log(`• try ${label} ...`);
    try {
      await cl.connect();
      console.log(`• connected: ${label}`);
      return cl;
    } catch (err) {
      console.log(`  ✗ ${err.code || ""} ${err.message}`);
      try { await cl.end(); } catch {}
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("모든 연결 후보 실패");
}

const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

async function ensureTable(client) {
  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      applied_at timestamptz default now()
    );
  `);
}

async function appliedSet(client) {
  const { rows } = await client.query("select filename from public.schema_migrations");
  return new Set(rows.map((r) => r.filename));
}

async function applyOne(client, filename) {
  const full = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(full, "utf8");
  console.log(`▶ applying ${filename} (${sql.length} bytes)`);
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query(
      "insert into public.schema_migrations(filename) values ($1) on conflict do nothing",
      [filename]
    );
    await client.query("commit");
    console.log(`✅ ${filename} applied`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  }
}

(async () => {
  const arg = process.argv[2];

  const client = await connectAny();

  try {
    await ensureTable(client);
    const already = await appliedSet(client);

    if (arg) {
      // 단일 파일 모드 — 풀패스 또는 파일명
      const filename = path.basename(arg);
      if (!fs.existsSync(path.join(migrationsDir, filename))) {
        throw new Error(`Not found: ${path.join(migrationsDir, filename)}`);
      }
      if (already.has(filename)) {
        console.log(`= ${filename} (이미 적용됨, 건너뜀)`);
      } else {
        await applyOne(client, filename);
      }
    } else {
      // 전체 모드 — migrations 디렉토리의 모든 *.sql 을 정렬해서 미적용분만
      if (!fs.existsSync(migrationsDir)) {
        console.log(`(no migrations directory: ${migrationsDir})`);
      } else {
        const files = fs
          .readdirSync(migrationsDir)
          .filter((f) => f.endsWith(".sql"))
          .sort();
        let applied = 0;
        for (const f of files) {
          if (already.has(f)) {
            console.log(`= ${f} (이미 적용됨)`);
            continue;
          }
          await applyOne(client, f);
          applied++;
        }
        console.log(`\n총 ${applied} 건 적용 완료.`);
      }
    }
  } finally {
    await client.end();
  }
})().catch((err) => {
  console.error("ERROR:", err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
