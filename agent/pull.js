#!/usr/bin/env node
// 실행: node --env-file=agent/.env agent/pull.js [<reportId>]
// 1) status=intake 인 reports 1건 가져오기 (id 미지정 시 가장 오래된 1건)
// 2) source_material(JSON 배열)에 적힌 PDF 들을 reports-pdf 버킷에서 다운로드
// 3) agent/inbox/<reportId>/ 에 저장 + meta.json + report_template.md 복사
"use strict";

const fs = require("fs");
const path = require("path");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("agent/.env 에 SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  console.error("실행 예: node --env-file=agent/.env agent/pull.js");
  process.exit(2);
}

const REST = `${SUPABASE_URL}/rest/v1`;
const STORAGE = `${SUPABASE_URL}/storage/v1`;
const H = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
};

async function get(url) {
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(`GET ${url} → ${r.status} ${await r.text()}`);
  return r.json();
}

async function downloadObject(bucket, objectPath, destFile) {
  const url = `${STORAGE}/object/${bucket}/${objectPath}`;
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(`download ${url} → ${r.status} ${await r.text()}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.writeFileSync(destFile, buf);
  return buf.length;
}

(async () => {
  const argId = process.argv[2];
  const filter = argId
    ? `id=eq.${encodeURIComponent(argId)}`
    : `status=eq.intake&order=created_at.asc&limit=1`;
  const cols = "id,title,company,ticker,period,status,source_material,pdf_path,created_at,created_by";
  const rows = await get(`${REST}/reports?select=${cols}&${filter}`);

  if (rows.length === 0) {
    console.log("intake 상태 보고서가 없습니다. 사이트의 /admin/reports/new 에서 PDF 를 업로드하세요.");
    return;
  }
  const row = rows[0];
  console.log(`Target report: id=${row.id}  company=${row.company}  period=${row.period}  status=${row.status}`);

  let paths = [];
  if (row.source_material) {
    try { paths = JSON.parse(row.source_material); } catch { paths = []; }
    if (!Array.isArray(paths)) paths = [];
  }
  if (paths.length === 0 && row.pdf_path) paths = [row.pdf_path];
  if (paths.length === 0) {
    console.error("source_material 또는 pdf_path 가 비어 있습니다. 사이트에서 PDF 를 다시 업로드하세요.");
    process.exit(1);
  }

  const inboxDir = path.join(__dirname, "inbox", row.id);
  const pdfDir = path.join(inboxDir, "pdf");
  fs.mkdirSync(pdfDir, { recursive: true });

  let totalBytes = 0;
  for (const objectPath of paths) {
    const fileName = path.basename(objectPath);
    const destFile = path.join(pdfDir, fileName);
    process.stdout.write(`  ↓ ${objectPath} ... `);
    const size = await downloadObject("reports-pdf", objectPath, destFile);
    totalBytes += size;
    process.stdout.write(`${(size / 1024).toFixed(1)} KB\n`);
  }

  // meta.json 작성
  const meta = {
    id: row.id,
    title: row.title,
    company: row.company,
    ticker: row.ticker,
    period: row.period,
    status: row.status,
    created_at: row.created_at,
    pdf_paths: paths,
  };
  fs.writeFileSync(path.join(inboxDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

  // report_template.md 를 작업용으로 복사 (한 번만)
  const templateSrc = path.join(__dirname, "report_template.md");
  const reportDraft = path.join(inboxDir, "report.md");
  if (!fs.existsSync(reportDraft) && fs.existsSync(templateSrc)) {
    let tmpl = fs.readFileSync(templateSrc, "utf8");
    const today = new Date().toISOString().slice(0, 10);
    tmpl = tmpl
      .replace(/\{회사명\}/g, row.company || "회사명")
      .replace(/\{영문약호\}/g, row.ticker || "TICKER")
      .replace(/\{YYYY-MM-DD\}/g, today);
    fs.writeFileSync(reportDraft, tmpl, "utf8");
  }

  console.log("");
  console.log(`✅ Pull 완료. ${paths.length} 파일 · ${(totalBytes/1024).toFixed(1)} KB`);
  console.log(`   Inbox: ${inboxDir}`);
  console.log(`   메타:  ${path.join(inboxDir, "meta.json")}`);
  console.log(`   초안:  ${reportDraft}  (← 여기에 9섹션 작성)`);
  process.exit(0);
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
