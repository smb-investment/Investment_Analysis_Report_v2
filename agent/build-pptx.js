#!/usr/bin/env node
/**
 * build-pptx.js
 * slides.json -> 21-slide McKinsey Pastel PPTX (pptxgenjs)
 * LLM 호출 0 - 순수 데이터 렌더링
 *
 * Usage:
 *   node agent/build-pptx.js <slides.json path> <output.pptx path>
 *   node agent/build-pptx.js sample  (테스트: 경남QSF 샘플 생성)
 */

import pptxgen from "pptxgenjs";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- 컬러 팔레트 ---
const C = {
  blue:   "6B7FA3",
  green:  "7BAD8C",
  gold:   "D4A962",
  purple: "A89DBF",
  pink:   "C97B7B",
  bg:     "F8F9FA",
  white:  "FFFFFF",
  dark:   "1E293B",
  gray:   "64748B",
  lgray:  "E2E8F0",
};
const ACCENT_COLORS = [C.blue, C.green, C.gold, C.purple, C.pink];

// --- 슬라이드 크기 (16:9 인치) ---
const W = 13.33;
const H = 7.5;

// --- 공통 헬퍼 ---

/** 슬라이드 배경 + 상단 색상 헤더 바 */
function slideBase(slide, accentColor = C.blue) {
  slide.background = { color: C.bg };
  // 상단 accent bar (얇은 선)
  slide.addShape("rect", { x: 0, y: 0, w: W, h: 0.06, fill: { color: accentColor }, line: { type: "none" } });
}

/** 슬라이드 제목 + 서브타이틀 메시지 */
function slideHeader(slide, num, title, subtitle, accentColor = C.blue) {
  if (num) {
    slide.addText(num, {
      x: 0.4, y: 0.15, w: 0.5, h: 0.35,
      fontSize: 11, color: accentColor, bold: true, fontFace: "Pretendard",
    });
  }
  slide.addText(title, {
    x: num ? 0.9 : 0.4, y: 0.12, w: W - 1.3, h: 0.4,
    fontSize: 18, color: C.dark, bold: true, fontFace: "Pretendard",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4, y: 0.55, w: W - 0.8, h: 0.35,
      fontSize: 11, color: C.gray, fontFace: "Pretendard",
    });
  }
  // 구분선
  slide.addShape("line", {
    x: 0.4, y: num ? 0.52 : 0.56, w: W - 0.8, h: 0,
    line: { color: C.lgray, width: 0.75 },
  });
}

/** 하단 푸터 */
function slideFooter(slide, company, docTitle) {
  const text = `${company} | ${docTitle} | CONFIDENTIAL`;
  slide.addText(text, {
    x: 0.4, y: H - 0.28, w: W - 0.8, h: 0.22,
    fontSize: 8, color: C.gray, fontFace: "Pretendard", align: "center",
  });
}

/** KPI 카드 (숫자 크게, 라벨 작게, 설명 더 작게) */
function kpiCard(slide, x, y, w, h, value, label, desc, accentColor = C.blue) {
  slide.addShape("rect", { x, y, w, h, fill: { color: C.white }, line: { color: C.lgray, width: 0.75 }, rectRadius: 0.08 });
  slide.addShape("line", { x, y: y + 0.04, w: w * 0.35, h: 0, line: { color: accentColor, width: 2.5 } });
  slide.addText(value, { x: x + 0.12, y: y + 0.1, w: w - 0.24, h: h * 0.42, fontSize: 22, color: accentColor, bold: true, fontFace: "Pretendard", shrinkText: true });
  slide.addText(label, { x: x + 0.12, y: y + h * 0.52, w: w - 0.24, h: 0.22, fontSize: 9.5, color: C.dark, bold: true, fontFace: "Pretendard" });
  if (desc) slide.addText(desc, { x: x + 0.12, y: y + h * 0.72, w: w - 0.24, h: 0.2, fontSize: 8, color: C.gray, fontFace: "Pretendard" });
}

/** 일반 콘텐츠 카드 (제목 + 본문) */
function contentCard(slide, x, y, w, h, title, body, accentColor = C.blue) {
  slide.addShape("rect", { x, y, w, h, fill: { color: C.white }, line: { color: C.lgray, width: 0.75 }, rectRadius: 0.08 });
  slide.addShape("line", { x, y: y + 0.04, w: w * 0.35, h: 0, line: { color: accentColor, width: 2.5 } });
  slide.addText(title, { x: x + 0.12, y: y + 0.12, w: w - 0.24, h: 0.25, fontSize: 10, color: C.dark, bold: true, fontFace: "Pretendard" });
  slide.addText(body, { x: x + 0.12, y: y + 0.4, w: w - 0.24, h: h - 0.55, fontSize: 8.5, color: C.gray, fontFace: "Pretendard", valign: "top", wrap: true });
}

// --- 슬라이드 렌더러 ---

function renderCover(pptx, d, meta) {
  const slide = pptx.addSlide();
  // 배경
  slide.background = { color: C.blue };
  // 좌측 텍스트 영역
  slide.addText(d.company, { x: 0.5, y: 0.6, w: 5.5, h: 0.6, fontSize: 22, color: C.white, bold: true, fontFace: "Pretendard" });
  slide.addText(d.subtitle, { x: 0.5, y: 1.25, w: 5.5, h: 0.8, fontSize: 28, color: C.white, bold: true, fontFace: "Pretendard", lineSpacingMultiple: 1.2 });
  slide.addText(d.tagline, { x: 0.5, y: 2.2, w: 5.5, h: 0.4, fontSize: 12, color: "D4E3F0", fontFace: "Pretendard" });
  slide.addShape("line", { x: 0.5, y: 2.72, w: 2.5, h: 0, line: { color: C.gold, width: 2 } });
  slide.addText(`PF 조달 제안서 | ${d.date || meta.date} | CONFIDENTIAL`, { x: 0.5, y: 2.9, w: 5.5, h: 0.3, fontSize: 10, color: "A8C4DC", fontFace: "Pretendard" });

  // 우측 KPI 카드 그리드 (2x2)
  const cards = [
    { value: d.kpi1_value, label: d.kpi1_label },
    { value: d.kpi2_value, label: d.kpi2_label },
    { value: d.kpi3_value, label: d.kpi3_label },
    { value: d.kpi4_value, label: d.kpi4_label },
  ];
  const gx = 6.8, gy = 1.0, cw = 3.0, ch = 2.5, gap = 0.15;
  cards.forEach((c, i) => {
    const cx = gx + (i % 2) * (cw + gap);
    const cy = gy + Math.floor(i / 2) * (ch + gap);
    slide.addShape("rect", { x: cx, y: cy, w: cw, h: ch, fill: { color: "FFFFFF", transparency: 15 }, line: { color: "FFFFFF", width: 0.5 }, rectRadius: 0.1 });
    slide.addText(c.value, { x: cx + 0.15, y: cy + 0.2, w: cw - 0.3, h: ch * 0.55, fontSize: 32, color: C.white, bold: true, fontFace: "Pretendard", shrinkText: true, align: "center" });
    slide.addText(c.label, { x: cx + 0.15, y: cy + ch * 0.62, w: cw - 0.3, h: 0.4, fontSize: 10, color: "D4E3F0", fontFace: "Pretendard", align: "center", bold: true });
  });

  // 하단
  slide.addText(`${d.company} | ${d.subtitle} | ${d.date || meta.date} | CONFIDENTIAL`, {
    x: 0, y: H - 0.28, w: W, h: 0.22, fontSize: 8, color: "A8C4DC", fontFace: "Pretendard", align: "center",
  });
}

function renderToc(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.blue);
  slideHeader(slide, null, "목차 (Table of Contents)", null);
  slideFooter(slide, meta.company, meta.project);

  const sections = d.sections || [];
  const cols = 2, rows = Math.ceil(sections.length / cols);
  const cw = (W - 1.0) / cols, ch = (H - 1.6) / rows, gx = 0.5, gy = 1.1, gap = 0.12;
  sections.forEach((s, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = gx + col * (cw + gap), y = gy + row * (ch + gap);
    const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
    slide.addShape("rect", { x, y, w: cw - gap, h: ch - gap, fill: { color: C.white }, line: { color: C.lgray, width: 0.75 }, rectRadius: 0.08 });
    slide.addShape("rect", { x, y, w: 0.06, h: ch - gap, fill: { color }, line: { type: "none" }, rectRadius: 0.03 });
    slide.addShape("oval", { x: x + 0.2, y: y + (ch - gap) * 0.2, w: 0.45, h: 0.45, fill: { color }, line: { type: "none" } });
    slide.addText(s.num, { x: x + 0.2, y: y + (ch - gap) * 0.2, w: 0.45, h: 0.45, fontSize: 13, color: C.white, bold: true, fontFace: "Pretendard", align: "center", valign: "middle" });
    slide.addText(s.title, { x: x + 0.8, y: y + 0.15, w: cw - 1.1, h: 0.35, fontSize: 13, color: C.dark, bold: true, fontFace: "Pretendard" });
    slide.addText(s.desc, { x: x + 0.8, y: y + 0.5, w: cw - 1.1, h: 0.3, fontSize: 9, color: C.gray, fontFace: "Pretendard" });
  });
}

function renderExecutiveSummary(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.blue);
  slideHeader(slide, "01", "Executive Summary", d.headline);
  slideFooter(slide, meta.company, meta.project);

  const cards = d.cards || [];
  const cols = 3, rows = 2;
  const cw = (W - 0.8) / cols, ch = (H - 1.7) / rows, gx = 0.4, gy = 1.1, gap = 0.1;
  cards.slice(0, 6).forEach((c, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = gx + col * (cw + gap), y = gy + row * (ch + gap);
    contentCard(slide, x, y, cw - gap, ch - gap, c.title, c.body, ACCENT_COLORS[i % ACCENT_COLORS.length]);
  });
}

function renderMarketOpportunity(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.green);
  slideHeader(slide, "02", "시장 기회 분석", d.headline, C.green);
  slideFooter(slide, meta.company, meta.project);

  const kpis = d.kpis || [];
  const kw = (W - 0.8) / 3, kh = 1.5, gy = 1.05;
  kpis.slice(0, 3).forEach((k, i) => {
    kpiCard(slide, 0.4 + i * (kw + 0.06), gy, kw - 0.06, kh, k.value, k.label, k.desc, ACCENT_COLORS[i]);
  });

  const pains = d.pain_points || [];
  const pw = (W - 0.8) / 2, ph = 1.6, py = 2.7, gap = 0.1;
  pains.slice(0, 4).forEach((p, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    contentCard(slide, 0.4 + col * (pw + gap), py + row * (ph + gap), pw - gap, ph - gap, p.title, p.body, ACCENT_COLORS[i % ACCENT_COLORS.length]);
  });
}

function renderCompetitiveAdvantage(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.gold);
  slideHeader(slide, "02", "경쟁 우위 분석", d.headline, C.gold);
  slideFooter(slide, meta.company, meta.project);

  const advs = d.advantages || [];
  const cw = (W - 0.8) / 5, ch = H - 1.7, gx = 0.4, gy = 1.1, gap = 0.08;
  advs.slice(0, 5).forEach((a, i) => {
    const x = gx + i * (cw + gap);
    const color = ACCENT_COLORS[i];
    slide.addShape("rect", { x, y: gy, w: cw - gap, h: ch, fill: { color: C.white }, line: { color: C.lgray, width: 0.75 }, rectRadius: 0.08 });
    slide.addShape("oval", { x: x + (cw - gap) / 2 - 0.25, y: gy + 0.2, w: 0.5, h: 0.5, fill: { color }, line: { type: "none" } });
    slide.addText(a.num, { x: x + (cw - gap) / 2 - 0.25, y: gy + 0.2, w: 0.5, h: 0.5, fontSize: 13, color: C.white, bold: true, fontFace: "Pretendard", align: "center", valign: "middle" });
    slide.addShape("line", { x: x + 0.15, y: gy + 0.9, w: cw - gap - 0.3, h: 0, line: { color, width: 1.5 } });
    slide.addText(a.title, { x: x + 0.1, y: gy + 1.0, w: cw - gap - 0.2, h: 0.35, fontSize: 10, color: C.dark, bold: true, fontFace: "Pretendard", align: "center", wrap: true });
    slide.addText(a.value, { x: x + 0.1, y: gy + 1.4, w: cw - gap - 0.2, h: 0.5, fontSize: 14, color, bold: true, fontFace: "Pretendard", align: "center", shrinkText: true });
    slide.addText(a.desc, { x: x + 0.1, y: gy + 2.0, w: cw - gap - 0.2, h: ch - 2.2, fontSize: 8, color: C.gray, fontFace: "Pretendard", align: "center", wrap: true });
  });
}

function renderBusinessModel(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.purple);
  slideHeader(slide, "03", "비즈니스 모델 & 수익 구조", d.headline, C.purple);
  slideFooter(slide, meta.company, meta.project);

  // Value chain
  const chain = d.value_chain || [];
  const bw = (W - 0.8) / chain.length, bh = 0.65, by = 1.15, gap = 0.05;
  chain.forEach((item, i) => {
    const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
    slide.addShape("rect", { x: 0.4 + i * (bw + gap), y: by, w: bw - gap, h: bh, fill: { color }, line: { type: "none" }, rectRadius: 0.05 });
    slide.addText(item, { x: 0.4 + i * (bw + gap), y: by, w: bw - gap, h: bh, fontSize: 8.5, color: C.white, bold: true, fontFace: "Pretendard", align: "center", valign: "middle", wrap: true });
    if (i < chain.length - 1) {
      slide.addShape("rect", { x: 0.4 + (i + 1) * (bw + gap) - 0.18, y: by + bh / 2 - 0.08, w: 0.22, h: 0.16, fill: { color: C.lgray }, line: { type: "none" } });
    }
  });

  // Revenue streams
  const revenues = d.revenue_streams || [];
  const rw = (W - 0.8) / revenues.length, rh = H - 2.35, ry = 2.0, rgap = 0.08;
  revenues.slice(0, 5).forEach((r, i) => {
    const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
    const x = 0.4 + i * (rw + rgap);
    slide.addShape("rect", { x, y: ry, w: rw - rgap, h: rh, fill: { color: C.white }, line: { color: C.lgray, width: 0.75 }, rectRadius: 0.08 });
    slide.addShape("line", { x, y: ry + 0.04, w: (rw - rgap) * 0.4, h: 0, line: { color, width: 2.5 } });
    slide.addText(r.pct, { x: x + 0.1, y: ry + 0.12, w: rw - rgap - 0.2, h: 0.7, fontSize: 22, color, bold: true, fontFace: "Pretendard", align: "center", shrinkText: true });
    slide.addText(r.title, { x: x + 0.08, y: ry + 0.85, w: rw - rgap - 0.16, h: 0.35, fontSize: 9, color: C.dark, bold: true, fontFace: "Pretendard", align: "center", wrap: true });
    slide.addText(r.desc, { x: x + 0.08, y: ry + 1.22, w: rw - rgap - 0.16, h: rh - 1.4, fontSize: 8, color: C.gray, fontFace: "Pretendard", align: "center", wrap: true });
  });
}

function renderRevenueForecast(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.blue);
  slideHeader(slide, "04", "재무 전망 -- 매출 예측 (2027~2031)", d.headline);
  slideFooter(slide, meta.company, meta.project);

  // KPI 3개
  const kpis = d.kpis || [];
  const kw = (W - 0.8) / 3, kh = 1.3;
  kpis.slice(0, 3).forEach((k, i) => {
    kpiCard(slide, 0.4 + i * (kw + 0.06), 1.05, kw - 0.06, kh, k.value, k.label, k.desc, ACCENT_COLORS[i]);
  });

  // 막대 차트 (간단 수동 렌더링)
  const data = d.chart_data || [];
  if (data.length > 0) {
    const chartX = 0.5, chartY = 2.55, chartW = W - 1.0, chartH = H - 3.3;
    const maxVal = Math.max(...data.map(d => d.value));
    const barW = chartW / data.length * 0.6;
    const barGap = chartW / data.length;

    data.forEach((pt, i) => {
      const barH = (pt.value / maxVal) * chartH;
      const bx = chartX + i * barGap + barGap * 0.2;
      const by = chartY + chartH - barH;
      const color = pt.phase2 ? C.green : C.blue;
      slide.addShape("rect", { x: bx, y: by, w: barW, h: barH, fill: { color }, line: { type: "none" }, rectRadius: 0.03 });
      slide.addText(String(pt.value), { x: bx, y: by - 0.22, w: barW, h: 0.2, fontSize: 8, color: C.dark, bold: true, fontFace: "Pretendard", align: "center" });
      slide.addText(pt.year, { x: bx, y: chartY + chartH + 0.05, w: barW, h: 0.2, fontSize: 8, color: C.gray, fontFace: "Pretendard", align: "center" });
    });
  }
}

function renderCapex(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.gold);
  slideHeader(slide, "04", "CAPEX 계획 & Phase Economics", d.headline, C.gold);
  slideFooter(slide, meta.company, meta.project);

  const phases = d.phases || {};
  const p1 = phases.phase1 || {};
  const p2 = phases.phase2 || {};
  const tw = (W - 1.0) / 2, th = H - 1.7, ty = 1.1, gap = 0.12;

  [p1, p2].forEach((ph, idx) => {
    const color = idx === 0 ? C.blue : C.green;
    const px = 0.5 + idx * (tw + gap);
    slide.addShape("rect", { x: px, y: ty, w: tw, h: th, fill: { color: C.white }, line: { color: C.lgray, width: 0.75 }, rectRadius: 0.08 });
    slide.addShape("rect", { x: px, y: ty, w: tw, h: 0.5, fill: { color }, line: { type: "none" }, rectRadius: 0.08 });
    slide.addText(ph.label || "", { x: px + 0.15, y: ty + 0.08, w: tw - 0.3, h: 0.3, fontSize: 11, color: C.white, bold: true, fontFace: "Pretendard" });
    slide.addText(ph.subtitle || "", { x: px + 0.15, y: ty + 0.35, w: tw - 0.3, h: 0.18, fontSize: 8, color: "D4E3F0", fontFace: "Pretendard" });

    const rows = ph.rows || [];
    rows.forEach((r, ri) => {
      const ry = ty + 0.62 + ri * 0.55;
      if (ri % 2 === 0) {
        slide.addShape("rect", { x: px + 0.08, y: ry - 0.05, w: tw - 0.16, h: 0.5, fill: { color: "F1F5F9" }, line: { type: "none" } });
      }
      slide.addText(r.key, { x: px + 0.15, y: ry, w: tw * 0.45, h: 0.38, fontSize: 8.5, color: C.gray, fontFace: "Pretendard", valign: "middle" });
      slide.addText(r.value, { x: px + tw * 0.47, y: ry, w: tw * 0.5, h: 0.38, fontSize: 9, color: C.dark, bold: true, fontFace: "Pretendard", valign: "middle" });
    });

    if (ph.memo) {
      const memoY = ty + 0.62 + (rows.length) * 0.55;
      slide.addShape("rect", { x: px + 0.08, y: memoY, w: tw - 0.16, h: th - memoY + ty - 0.1, fill: { color: idx === 0 ? "EBF0F7" : "EBF4EE" }, line: { type: "none" }, rectRadius: 0.05 });
      slide.addText(ph.memo, { x: px + 0.15, y: memoY + 0.08, w: tw - 0.3, h: th - memoY + ty - 0.25, fontSize: 8, color: C.gray, fontFace: "Pretendard", wrap: true });
    }
  });
}

function renderInvestmentProposal(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.purple);
  slideHeader(slide, "05", "투자 제안 (Investment Proposal)", d.headline, C.purple);
  slideFooter(slide, meta.company, meta.project);

  // 상단 KPI 4개
  const kpis = d.kpis || [];
  const kw = (W - 0.8) / 4, kh = 1.3;
  kpis.slice(0, 4).forEach((k, i) => {
    kpiCard(slide, 0.4 + i * (kw + 0.06), 1.05, kw - 0.06, kh, k.value, k.label, k.desc, ACCENT_COLORS[i]);
  });

  // 자금용도 4개
  const uses = d.use_of_proceeds || [];
  const uw = (W - 0.8) / 4, uh = 1.1, uy = 2.5;
  slide.addText("자금 용도 (Use of Proceeds)", { x: 0.4, y: uy - 0.3, w: 4, h: 0.25, fontSize: 10, color: C.dark, bold: true, fontFace: "Pretendard" });
  uses.slice(0, 4).forEach((u, i) => {
    const color = ACCENT_COLORS[i];
    const x = 0.4 + i * (uw + 0.06);
    slide.addShape("rect", { x, y: uy, w: uw - 0.06, h: uh, fill: { color }, line: { type: "none" }, rectRadius: 0.08 });
    slide.addText(u.value, { x: x + 0.1, y: uy + 0.1, w: uw - 0.26, h: 0.45, fontSize: 16, color: C.white, bold: true, fontFace: "Pretendard", shrinkText: true, align: "center" });
    slide.addText(u.label, { x: x + 0.1, y: uy + 0.58, w: uw - 0.26, h: 0.38, fontSize: 8.5, color: "F0F4F8", fontFace: "Pretendard", align: "center", wrap: true });
  });

  // 투자자 보호 불릿
  const protections = d.investor_protection || [];
  const py = 3.75;
  slide.addText("투자자 보호 및 혜택", { x: 0.4, y: py - 0.25, w: 5, h: 0.22, fontSize: 10, color: C.dark, bold: true, fontFace: "Pretendard" });
  slide.addShape("rect", { x: 0.4, y: py, w: W - 0.8, h: H - py - 0.4, fill: { color: C.white }, line: { color: C.lgray, width: 0.75 }, rectRadius: 0.08 });
  protections.forEach((p, i) => {
    slide.addText(`• ${p}`, { x: 0.6, y: py + 0.1 + i * 0.42, w: W - 1.2, h: 0.38, fontSize: 8.5, color: C.gray, fontFace: "Pretendard", wrap: true });
  });
}

function renderRiskManagement(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.pink);
  slideHeader(slide, "06", "리스크 관리 전략", d.headline, C.pink);
  slideFooter(slide, meta.company, meta.project);

  const risks = d.risks || [];
  const rw = (W - 0.8) / Math.min(risks.length, 3), rh = (H - 1.7) / 2, gy = 1.1, gap = 0.1;
  risks.slice(0, 5).forEach((r, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.4 + col * (rw + gap), y = gy + row * (rh + gap);
    const badgeColor = r.badge_color === "green" ? C.green : r.badge_color === "gold" ? C.gold : C.pink;
    slide.addShape("rect", { x, y, w: rw - gap, h: rh - gap, fill: { color: C.white }, line: { color: C.lgray, width: 0.75 }, rectRadius: 0.08 });
    slide.addText(r.title, { x: x + 0.12, y: y + 0.1, w: rw - gap - 0.8, h: 0.3, fontSize: 11, color: C.dark, bold: true, fontFace: "Pretendard" });
    slide.addShape("rect", { x: x + rw - gap - 0.7, y: y + 0.1, w: 0.6, h: 0.25, fill: { color: badgeColor }, line: { type: "none" }, rectRadius: 0.05 });
    slide.addText(r.badge, { x: x + rw - gap - 0.7, y: y + 0.1, w: 0.6, h: 0.25, fontSize: 7.5, color: C.white, bold: true, fontFace: "Pretendard", align: "center", valign: "middle" });
    slide.addShape("line", { x: x + 0.12, y: y + 0.45, w: rw - gap - 0.24, h: 0, line: { color: C.lgray, width: 0.5 } });
    slide.addText(`리스크: ${r.risk}`, { x: x + 0.12, y: y + 0.5, w: rw - gap - 0.24, h: 0.3, fontSize: 8.5, color: C.gray, fontFace: "Pretendard" });
    slide.addText(`-> 대응: ${r.response}`, { x: x + 0.12, y: y + 0.82, w: rw - gap - 0.24, h: rh - gap - 0.95, fontSize: 8.5, color: C.dark, fontFace: "Pretendard", wrap: true });
  });
}

function renderRoadmap(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.green);
  slideHeader(slide, "06", "프로젝트 로드맵 (Project Roadmap)", d.headline, C.green);
  slideFooter(slide, meta.company, meta.project);

  const phases = d.phases || [];
  const pw = (W - 0.8) / phases.length, ph_h = H - 2.3, py = 1.1, gap = 0.08;
  phases.forEach((ph, i) => {
    const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
    const x = 0.4 + i * (pw + gap);
    slide.addShape("rect", { x, y: py, w: pw - gap, h: 0.55, fill: { color }, line: { type: "none" }, rectRadius: 0.05 });
    slide.addText(ph.label, { x, y: py, w: pw - gap, h: 0.32, fontSize: 10, color: C.white, bold: true, fontFace: "Pretendard", align: "center", valign: "middle" });
    slide.addText(ph.period, { x, y: py + 0.3, w: pw - gap, h: 0.22, fontSize: 8, color: "D4E3F0", fontFace: "Pretendard", align: "center" });
    slide.addShape("rect", { x, y: py + 0.58, w: pw - gap, h: ph_h - 0.58, fill: { color: C.white }, line: { color: C.lgray, width: 0.75 }, rectRadius: 0.05 });
    (ph.items || []).forEach((item, ii) => {
      const iy = py + 0.72 + ii * 0.75;
      slide.addShape("oval", { x: x + 0.15, y: iy, w: 0.18, h: 0.18, fill: { color }, line: { type: "none" } });
      slide.addText(String(ii + 1), { x: x + 0.15, y: iy, w: 0.18, h: 0.18, fontSize: 7, color: C.white, bold: true, fontFace: "Pretendard", align: "center", valign: "middle" });
      slide.addText(item, { x: x + 0.38, y: iy - 0.02, w: pw - gap - 0.5, h: 0.65, fontSize: 8, color: C.gray, fontFace: "Pretendard", wrap: true });
    });
  });

  if (d.note) {
    slide.addShape("rect", { x: 0.4, y: H - 0.75, w: W - 0.8, h: 0.35, fill: { color: "EBF4EE" }, line: { color: C.green, width: 0.5 }, rectRadius: 0.05 });
    slide.addText(d.note, { x: 0.55, y: H - 0.72, w: W - 1.1, h: 0.3, fontSize: 8, color: C.dark, fontFace: "Pretendard" });
  }
}

function renderConclusion(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.blue);
  slideHeader(slide, null, "결론 & 투자 제안 요약", null);
  slideFooter(slide, meta.company, meta.project);

  // 헤드라인 박스
  slide.addShape("rect", { x: 0.4, y: 0.6, w: W - 0.8, h: 0.9, fill: { color: "EBF0F7" }, line: { color: C.blue, width: 1 }, rectRadius: 0.08 });
  slide.addText(d.headline, { x: 0.6, y: 0.67, w: W - 1.2, h: 0.4, fontSize: 13, color: C.dark, bold: true, fontFace: "Pretendard" });
  if (d.subheadline) {
    slide.addText(d.subheadline, { x: 0.6, y: 1.05, w: W - 1.2, h: 0.35, fontSize: 9, color: C.gray, fontFace: "Pretendard" });
  }

  // KPI 4개
  const kpis = d.kpis || [];
  const kw = (W - 0.8) / 4, kh = 1.4;
  kpis.slice(0, 4).forEach((k, i) => {
    kpiCard(slide, 0.4 + i * (kw + 0.06), 1.65, kw - 0.06, kh, k.value, k.label, k.desc, ACCENT_COLORS[i]);
  });

  // Next Steps
  const steps = d.next_steps || [];
  slide.addText("Next Steps -- 즉시 실행 가능한 3가지 액션", { x: 0.4, y: 3.2, w: W - 0.8, h: 0.25, fontSize: 10, color: C.dark, bold: true, fontFace: "Pretendard" });
  const sw = (W - 0.8) / 3, sh = H - 3.6, sy = 3.48, sgap = 0.1;
  steps.slice(0, 3).forEach((s, i) => {
    const color = ACCENT_COLORS[i];
    const x = 0.4 + i * (sw + sgap);
    slide.addShape("rect", { x, y: sy, w: sw - sgap, h: sh, fill: { color: C.white }, line: { color: C.lgray, width: 0.75 }, rectRadius: 0.08 });
    slide.addShape("oval", { x: x + 0.15, y: sy + 0.12, w: 0.35, h: 0.35, fill: { color }, line: { type: "none" } });
    slide.addText(s.num, { x: x + 0.15, y: sy + 0.12, w: 0.35, h: 0.35, fontSize: 11, color: C.white, bold: true, fontFace: "Pretendard", align: "center", valign: "middle" });
    slide.addText(s.title, { x: x + 0.6, y: sy + 0.15, w: sw - sgap - 0.75, h: 0.3, fontSize: 10, color: C.dark, bold: true, fontFace: "Pretendard" });
    slide.addText(s.desc, { x: x + 0.15, y: sy + 0.55, w: sw - sgap - 0.3, h: sh - 0.7, fontSize: 8.5, color: C.gray, fontFace: "Pretendard", wrap: true });
  });
}

function renderAppendixCover(pptx, d, meta) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  slide.addShape("rect", { x: 2, y: 1.5, w: W - 4, h: H - 3, fill: { color: C.white }, line: { color: C.lgray, width: 0.75 }, rectRadius: 0.15 });
  slide.addText("첨부 자료 (Appendix)", { x: 2.5, y: 2.0, w: W - 5, h: 0.6, fontSize: 24, color: C.dark, bold: true, fontFace: "Pretendard" });
  slide.addShape("line", { x: 2.5, y: 2.75, w: W - 5, h: 0, line: { color: C.lgray, width: 1 } });
  const items = d.items || [];
  items.forEach((item, i) => {
    slide.addText(`${item}`, { x: 2.5, y: 2.95 + i * 0.38, w: W - 5, h: 0.35, fontSize: 9.5, color: C.gray, fontFace: "Pretendard" });
  });
  slide.addText(`${meta.company} | ${meta.project} | CONFIDENTIAL`, {
    x: 0, y: H - 0.28, w: W, h: 0.22, fontSize: 8, color: C.gray, fontFace: "Pretendard", align: "center",
  });
}

function renderSimpleAppendix(pptx, title, subtitle, content, meta, accentColor = C.blue) {
  const slide = pptx.addSlide();
  slideBase(slide, accentColor);
  slideHeader(slide, null, title, subtitle, accentColor);
  slideFooter(slide, meta.company, meta.project);
  if (content) {
    slide.addText(content, { x: 0.4, y: 1.1, w: W - 0.8, h: H - 1.6, fontSize: 9, color: C.gray, fontFace: "Pretendard", valign: "top", wrap: true });
  }
}

function renderAppendixTeam(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.blue);
  slideHeader(slide, null, "A-6  핵심 인력 프로필 (Key Management Team)", "행정고시·공인회계사 출신 CEO + 초저온 설비 전문 COO -- 검증된 실행 역량 보유", C.blue);
  slideFooter(slide, meta.company, meta.project);

  [d.ceo, d.coo].forEach((person, i) => {
    if (!person) return;
    const color = i === 0 ? C.blue : C.green;
    const x = 0.4 + i * ((W - 0.8) / 2 + 0.1);
    const pw = (W - 0.8) / 2 - 0.05, ph = H - 1.7, py = 1.1;
    slide.addShape("rect", { x, y: py, w: pw, h: ph, fill: { color: C.white }, line: { color: C.lgray, width: 0.75 }, rectRadius: 0.08 });
    slide.addShape("rect", { x, y: py, w: 0.7, h: 0.35, fill: { color }, line: { type: "none" }, rectRadius: 0.05 });
    slide.addText(person.title, { x, y: py, w: 0.7, h: 0.35, fontSize: 9, color: C.white, bold: true, fontFace: "Pretendard", align: "center", valign: "middle" });
    slide.addText(person.name, { x: x + 0.8, y: py + 0.05, w: pw - 0.9, h: 0.3, fontSize: 14, color: C.dark, bold: true, fontFace: "Pretendard" });
    slide.addText("주요 경력", { x: x + 0.15, y: py + 0.45, w: pw - 0.3, h: 0.22, fontSize: 9, color, bold: true, fontFace: "Pretendard" });
    (person.careers || []).forEach((c, ci) => {
      slide.addText(`• ${c}`, { x: x + 0.2, y: py + 0.7 + ci * 0.42, w: pw - 0.35, h: 0.38, fontSize: 8.5, color: C.gray, fontFace: "Pretendard", wrap: true });
    });
  });
}

function renderAppendixLoi(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.green);
  slideHeader(slide, null, "A-7  LOI 체결 현황 (Pre-Sales & Demand Verification)", d.headline, C.green);
  slideFooter(slide, meta.company, meta.project);

  // 3개 KPI
  const kpis = d.kpis || [];
  const kw = (W - 0.8) / 3, kh = 1.1;
  kpis.slice(0, 3).forEach((k, i) => {
    kpiCard(slide, 0.4 + i * (kw + 0.06), 1.05, kw - 0.06, kh, k.value, k.label, null, ACCENT_COLORS[i]);
  });

  // 4개 파트너 그룹
  const groups = d.groups || [];
  const gw = (W - 0.8) / 2, gh = (H - 2.4) / 2, gy = 2.28, ggap = 0.1;
  groups.slice(0, 4).forEach((g, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const color = g.color === "green" ? C.green : g.color === "purple" ? C.purple : g.color === "gold" ? C.gold : C.blue;
    const x = 0.4 + col * (gw + ggap), y = gy + row * (gh + ggap);
    slide.addShape("rect", { x, y, w: gw - ggap, h: gh - ggap, fill: { color: C.white }, line: { color: C.lgray, width: 0.75 }, rectRadius: 0.08 });
    slide.addText(g.title, { x: x + 0.12, y: y + 0.1, w: gw - ggap - 0.24, h: 0.28, fontSize: 10, color, bold: true, fontFace: "Pretendard" });
    const partners = g.partners || [];
    partners.forEach((p, pi) => {
      slide.addShape("rect", { x: x + 0.12 + pi * 1.3, y: y + 0.45, w: 1.2, h: 0.28, fill: { color }, line: { type: "none" }, rectRadius: 0.04 });
      slide.addText(p, { x: x + 0.12 + pi * 1.3, y: y + 0.45, w: 1.2, h: 0.28, fontSize: 8, color: C.white, bold: true, fontFace: "Pretendard", align: "center", valign: "middle" });
    });
    slide.addText(g.desc, { x: x + 0.12, y: y + 0.82, w: gw - ggap - 0.24, h: gh - ggap - 0.95, fontSize: 8, color: C.gray, fontFace: "Pretendard", wrap: true });
  });
}

function renderAppendixRevenueBreakdown(pptx, d, meta) {
  const slide = pptx.addSlide();
  slideBase(slide, C.blue);
  slideHeader(slide, null, "A-10  매출액구성", d.headline);
  slideFooter(slide, meta.company, meta.project);

  const table = d.table || [];
  if (table.length === 0) return;

  const headers = ["매출 구분", "2027년", "2028년", "2029년", "2030년", "2031년", "5년 증감"];
  const colW = [(W - 1.0) * 0.28, ...[...Array(5)].map(() => (W - 1.0) * 0.12), (W - 1.0) * 0.1];
  const rowH = 0.38;
  const tx = 0.5, ty = 1.1;

  // 헤더 행
  let cx = tx;
  headers.forEach((h, i) => {
    slide.addShape("rect", { x: cx, y: ty, w: colW[i], h: rowH, fill: { color: C.blue }, line: { type: "none" } });
    slide.addText(h, { x: cx + 0.05, y: ty, w: colW[i] - 0.1, h: rowH, fontSize: 8.5, color: C.white, bold: true, fontFace: "Pretendard", align: i === 0 ? "left" : "right", valign: "middle" });
    cx += colW[i];
  });

  // 데이터 행
  table.forEach((row, ri) => {
    const ry = ty + (ri + 1) * rowH;
    const bg = row.bold ? "EBF0F7" : ri % 2 === 0 ? C.white : "F8FAFC";
    const cells = [row.category, row.y2027, row.y2028, row.y2029, row.y2030, row.y2031, row.change];
    cx = tx;
    cells.forEach((cell, ci) => {
      slide.addShape("rect", { x: cx, y: ry, w: colW[ci], h: rowH, fill: { color: bg }, line: { color: C.lgray, width: 0.3 } });
      slide.addText(String(cell ?? ""), {
        x: cx + 0.05, y: ry, w: colW[ci] - 0.1, h: rowH,
        fontSize: 8.5,
        color: row.bold ? C.dark : C.gray,
        bold: !!row.bold,
        fontFace: "Pretendard",
        align: ci === 0 ? "left" : "right",
        valign: "middle",
      });
      cx += colW[ci];
    });
  });
}

// --- 메인 빌더 ---

function buildPptx(slidesData, outputPath) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE"; // 13.33" x 7.5"

  const meta = {
    company: slidesData.company || "Company",
    project: slidesData.project || "Project",
    date: slidesData.date || "2026년 3월",
  };
  const s = slidesData.slides || {};

  // 21 슬라이드 순서대로 렌더링
  if (s.cover)                      renderCover(pptx, s.cover, meta);
  if (s.toc)                        renderToc(pptx, s.toc, meta);
  if (s.executive_summary)          renderExecutiveSummary(pptx, s.executive_summary, meta);
  if (s.market_opportunity)         renderMarketOpportunity(pptx, s.market_opportunity, meta);
  if (s.competitive_advantage)      renderCompetitiveAdvantage(pptx, s.competitive_advantage, meta);
  if (s.business_model)             renderBusinessModel(pptx, s.business_model, meta);
  if (s.revenue_forecast)           renderRevenueForecast(pptx, s.revenue_forecast, meta);
  if (s.capex)                      renderCapex(pptx, s.capex, meta);
  if (s.investment_proposal)        renderInvestmentProposal(pptx, s.investment_proposal, meta);
  if (s.risk_management)            renderRiskManagement(pptx, s.risk_management, meta);
  if (s.roadmap)                    renderRoadmap(pptx, s.roadmap, meta);
  if (s.conclusion)                 renderConclusion(pptx, s.conclusion, meta);
  if (s.appendix_cover)             renderAppendixCover(pptx, s.appendix_cover, meta);
  if (s.appendix_bizreg)            renderSimpleAppendix(pptx, "A-1·A-2  사업자등록증 & 현장사진", `${s.appendix_bizreg.company} | 등록번호 ${s.appendix_bizreg.reg_no} | 설립 ${s.appendix_bizreg.established}`, null, meta, C.blue);
  if (s.appendix_tech)              renderSimpleAppendix(pptx, "A-3·A-4  QSF 기술등급 인증서 & LNG 냉열 특허 목록", `기술등급 ${s.appendix_tech.grade} (${s.appendix_tech.agency}) | 특허 ${(s.appendix_tech.patents||[]).length}건 등록`, (s.appendix_tech.patents||[]).map(p=>`[${p.status}] ${p.no}  ${p.title}`).join("\n"), meta, C.green);
  if (s.appendix_appraisal)         renderSimpleAppendix(pptx, "A-5  준공 후 감정평가서", `준공 기준시점 ${s.appendix_appraisal.date} | 감정평가액 ${s.appendix_appraisal.total} | 토지 ${s.appendix_appraisal.land} + 건물 ${s.appendix_appraisal.building}`, null, meta, C.gold);
  if (s.appendix_team)              renderAppendixTeam(pptx, s.appendix_team, meta);
  if (s.appendix_loi)               renderAppendixLoi(pptx, s.appendix_loi, meta);
  if (s.appendix_phase_detail)      renderSimpleAppendix(pptx, "A-8  2-Phase 전략 상세 로드맵", s.appendix_phase_detail.headline, s.appendix_phase_detail.timeline, meta, C.green);
  if (s.appendix_revenue_trend)     renderSimpleAppendix(pptx, "A-9  매출액 추세", s.appendix_revenue_trend.headline, null, meta, C.purple);
  if (s.appendix_revenue_breakdown) renderAppendixRevenueBreakdown(pptx, s.appendix_revenue_breakdown, meta);

  return pptx.writeFile({ fileName: outputPath });
}

// --- 엔트리포인트 ---

const [,, arg1, arg2] = process.argv;

if (arg1 === "sample") {
  // 샘플 데이터로 테스트
  const samplePath = join(__dirname, "proposal-inbox", "sample-slides.json");
  const outPath = join(__dirname, "proposal-inbox", "sample.pptx");

  // 샘플 slides.json 생성 (경남QSF 데이터)
  const sample = {
    company: "경남QSF",
    project: "초저온 QSF 급속동결 제조센터",
    date: "2026년 3월",
    slides: {
      cover: {
        company: "경남QSF",
        subtitle: "초저온 QSF 급속동결\n제조센터",
        tagline: "세계 최초 -60도 식품 콜드체인 허브 구축 사업",
        date: "2026년 3월",
        kpi1_value: "573억원", kpi1_label: "총 사업비",
        kpi2_value: "380억원", kpi2_label: "PF 조달 요청액",
        kpi3_value: "137톤/일", kpi3_label: "처리능력",
        kpi4_value: "2031E", kpi4_label: "EBITDA 645억 목표",
      },
      toc: {
        sections: [
          { num: "01", title: "Executive Summary", desc: "Deal Overview & 2-Phase Strategy" },
          { num: "02", title: "시장 기회 분석", desc: "시장 규모·경쟁 구도·산업 Pain Points" },
          { num: "03", title: "비즈니스 모델 & 기술", desc: "5대 수익원·QSF 인프라·LNG 냉열" },
          { num: "04", title: "재무 전망", desc: "매출 예측·CAPEX·수익성" },
          { num: "05", title: "투자 제안", desc: "자금 조달 구조·담보·투자자 보호" },
          { num: "06", title: "리스크 관리", desc: "5대 리스크 선제적 대응 체계" },
        ],
      },
      executive_summary: {
        headline: "국내 유일 -60도 대량 급속동결 인프라 선점 -- 검증된 수요(LOI)와 2-Phase 전략으로 고수익 실현",
        cards: [
          { title: "국내 유일 Mass QSF", body: "국내 최초 137톤/일 처리능력의 개방형 초저온 제조 플랫폼. 일반 냉동창고가 처리 불가한 대량 급속동결 수요 독점." },
          { title: "2-Phase Strategy", body: "Phase 1(전기식): Fast-Track 상업화 (2027.01)\nPhase 2(LNG): 에너지비 40~70% 절감 (2029)" },
          { title: "검증된 수요 (LOI)", body: "대형 유통사·수협 등 27개사 LOI 체결 완료. 월 5,800톤 물량 선확보 → 초기 가동률 92% 목표." },
          { title: "폭발적 성장 잠재력", body: "매출 CAGR ~65% (2027~2031)\n2031E 매출 1,698억원·EBITDA 645억원" },
          { title: "Deal Structure", body: "총 사업비 573억원·조달 요청 380억원(선순위)\n준공 후 감정평가 520억 → LTV 약 73%" },
          { title: "ESG & Efficiency", body: "버려지는 LNG 냉열(-162도) 활용.\n탄소 배출 저감·에너지 효율화·ESG 경영 실현." },
        ],
      },
      conclusion: {
        headline: "국내 유일 -60도 대량 급속동결 인프라 선점 및 단계적 확장을 통한 고수익 실현",
        subheadline: "-60도 검증된 수요(LOI 27개사·5,800톤/월)와 2-Phase 전략으로 리스크를 최소화하고, LNG 냉열 혁신으로 수익성을 극대화합니다.",
        kpis: [
          { value: "380억원", label: "PF 조달 요청", desc: "선순위·LTV 73%" },
          { value: "2027.01", label: "상업운전 목표", desc: "Phase 1 전기식" },
          { value: "1,698억", label: "2031E 매출", desc: "CAGR ~65%" },
          { value: "27개사", label: "LOI 확보", desc: "월 5,800톤 선확보" },
        ],
        next_steps: [
          { num: "1", title: "실사 (Due Diligence)", desc: "사업계획서·기술 인증·LOI 검토 및 현장 실사 일정 협의" },
          { num: "2", title: "Term Sheet 협의", desc: "금리·Tranche 구조·담보 조건 협의 및 잠정 Term Sheet 서명" },
          { num: "3", title: "PF 약정 체결", desc: "2026.04 목표 PF 약정 체결 → 2026.05 공사 재개" },
        ],
      },
    },
  };

  try { mkdirSync(join(__dirname, "proposal-inbox"), { recursive: true }); } catch {}

  writeFileSync(samplePath, JSON.stringify(sample, null, 2));
  console.log("Sample slides.json written to:", samplePath);

  buildPptx(sample, outPath).then(() => {
    console.log("Sample PPTX generated:", outPath);
    console.log("   Open with PowerPoint to verify the design.");
  }).catch(err => {
    console.error("Failed:", err.message);
    process.exit(1);
  });

} else if (arg1 && arg2) {
  const slidesData = JSON.parse(readFileSync(arg1, "utf8"));
  buildPptx(slidesData, arg2).then(() => {
    console.log("PPTX generated:", arg2);
  }).catch(err => {
    console.error("Failed:", err.message);
    process.exit(1);
  });
} else {
  console.log("Usage:");
  console.log("  node agent/build-pptx.js sample                    # generate sample PPTX");
  console.log("  node agent/build-pptx.js slides.json output.pptx   # build from data");
  process.exit(0);
}
