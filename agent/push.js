#!/usr/bin/env node
// 실행: node --env-file=agent/.env agent/push.js <reportId> [--web-search]
// 1) agent/inbox/<reportId>/report.md (필수) + report.html (없으면 md_to_html.js 로 생성)
// 2) reports-md / reports-html 버킷에 업로드
// 3) reports 행을 status=intake → draft 로 갱신 (title/company/period/summary/model_used/web_search_used)
// 4) 사이트 어드민이 검토 후 publish 로 토글
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("agent/.env 에 SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  console.error("실행 예: node --env-file=agent/.env agent/push.js <reportId>");
  process.exit(2);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const args = process.argv.slice(2);
const reportId = args.find((a) => !a.startsWith("--"));
const webSearch = args.includes("--web-search");

if (!reportId) {
  console.error("Usage: node --env-file=agent/.env agent/push.js <reportId> [--web-search]");
  process.exit(2);
}

const REST = `${SUPABASE_URL}/rest/v1`;
const STORAGE = `${SUPABASE_URL}/storage/v1`;
const H = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
};

async function getJSON(url) {
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(`GET ${url} → ${r.status} ${await r.text()}`);
  return r.json();
}

async function patchJSON(url, body) {
  const r = await fetch(url, {
    method: "PATCH",
    headers: { ...H, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${url} → ${r.status} ${await r.text()}`);
  return r.json();
}

async function uploadObject(bucket, objectPath, buf, contentType) {
  // Supabase Storage 는 upsert 시 기존 metadata(Content-Type 등)를 보존하므로,
  // 안전하게 remove → upload (insert) 순서로 진행.
  await sb.storage.from(bucket).remove([objectPath]); // 없으면 no-op
  const { data, error } = await sb.storage.from(bucket).upload(objectPath, buf, {
    contentType,
    upsert: false,
    cacheControl: "no-cache",
  });
  if (error) throw new Error(`upload ${bucket}/${objectPath} → ${error.message}`);
  return data;
}

function extractTitleAndSummary(mdText) {
  const lines = mdText.split(/\r?\n/);
  let title = null;
  for (const line of lines) {
    const m = line.match(/^#\s+(.+?)\s*$/);
    if (m) { title = m[1].trim(); break; }
  }
  // Summary: first paragraph after "## 0." or "Executive Summary", whichever comes first
  let summary = null;
  const ix = mdText.search(/^##\s+0\.|^##\s+0\b|Executive\s+Summary/im);
  if (ix >= 0) {
    const tail = mdText.slice(ix).split(/\r?\n/);
    // Skip the heading itself, take next non-empty non-heading lines until blank
    let collected = [];
    for (let i = 1; i < tail.length; i++) {
      const ln = tail[i].trim();
      if (!ln) { if (collected.length) break; else continue; }
      if (/^#{1,6}\s/.test(ln)) { if (collected.length) break; else continue; }
      collected.push(ln);
      if (collected.join(" ").length > 240) break;
    }
    summary = collected.join(" ").replace(/\s+/g, " ").slice(0, 400) || null;
  }
  return { title, summary };
}

(async () => {
  const inboxDir = path.join(__dirname, "inbox", reportId);
  const mdPath = path.join(inboxDir, "report.md");
  const htmlPath = path.join(inboxDir, "report.html");

  if (!fs.existsSync(mdPath)) {
    console.error(`report.md 가 없습니다: ${mdPath}`);
    console.error("pull 후 report.md 를 작성한 뒤 다시 실행하세요.");
    process.exit(1);
  }

  // 1) HTML 자동 생성 (없거나 md 보다 오래된 경우)
  const needsHtml = !fs.existsSync(htmlPath) || fs.statSync(htmlPath).mtimeMs < fs.statSync(mdPath).mtimeMs;
  if (needsHtml) {
    console.log("• md → html 변환 중...");
    const r = spawnSync(process.execPath, [path.join(__dirname, "md_to_html.js"), mdPath, htmlPath], { stdio: "inherit" });
    if (r.status !== 0) { console.error("md_to_html.js 실패"); process.exit(1); }
  }

  // 2) 메타 추출
  const mdText = fs.readFileSync(mdPath, "utf8");
  const { title, summary } = extractTitleAndSummary(mdText);

  // 3) Storage 업로드 (덮어쓰기 허용)
  const mdObjectPath = `${reportId}/report.md`;
  const htmlObjectPath = `${reportId}/report.html`;
  console.log(`• 업로드 reports-md/${mdObjectPath} ...`);
  await uploadObject("reports-md", mdObjectPath, fs.readFileSync(mdPath), "text/markdown; charset=utf-8");
  console.log(`• 업로드 reports-html/${htmlObjectPath} ...`);
  await uploadObject("reports-html", htmlObjectPath, fs.readFileSync(htmlPath), "text/html; charset=utf-8");

  // 4) DB 갱신 — 기존 메타(company/period 등)는 그대로 두고 필요 항목만 update
  const existing = await getJSON(`${REST}/reports?select=id,title,company,period,status&id=eq.${reportId}`);
  if (!existing.length) {
    console.error(`reports 행을 찾지 못함: id=${reportId}`);
    process.exit(1);
  }
  const cur = existing[0];

  const updateBody = {
    status: "draft",
    md_path: mdObjectPath,
    html_path: htmlObjectPath,
    model_used: "claude-code",
    web_search_used: webSearch,
  };
  if (title && (!cur.title || cur.title === "(제목 없음)")) updateBody.title = title;
  if (summary) updateBody.summary = summary;

  const updated = await patchJSON(`${REST}/reports?id=eq.${reportId}`, updateBody);

  console.log("");
  console.log("✅ Push 완료");
  console.log(`   id        : ${reportId}`);
  console.log(`   status    : ${updated[0].status}  (draft 로 전환됨)`);
  console.log(`   title     : ${updated[0].title}`);
  console.log(`   company   : ${updated[0].company}`);
  console.log(`   web search: ${webSearch}`);
  console.log("");
  console.log("👉 다음 단계: 사이트의 /admin 에서 이 보고서를 검토 후 'published' 로 토글하세요.");
  process.exit(0);
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
