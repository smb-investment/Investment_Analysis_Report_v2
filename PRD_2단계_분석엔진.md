# 【2단계】 분석·생성 엔진 (Claude Code, 구독제) — 빌드 지시서

> **사용법:** **1단계(사이트)가 배포 완료된 뒤**, 이 파일 전체를 복사해 Claude Code에 붙여넣으세요.
> **이 단계의 결과물:** 사이트에 업로드된 자료(status=`intake`)를 Claude Code에서 분석해 **9섹션 투자검토보고서(MD+HTML)**로 만들고, Supabase에 푸시(status=`draft`)하는 도구·워크플로우.

---

## 0. Claude Code에게 (반드시 먼저)

- **이 단계는 "분석 도구"다.** 보고서 생성은 전적으로 이 Claude Code 세션(구독제)에서 일어난다. **배포된 사이트는 여전히 Claude를 호출하지 않는다.**
- **⚠️ 과금 방지(중요):** 시작 시 `/status`로 **구독(Pro/Max) 로그인** 확인. `ANTHROPIC_API_KEY`가 설정돼 있으면 알려주고 제거 권고(있으면 분석이 유료 API로 과금됨 — 과거 비용 폭증의 원인).
- **service_role 키**는 이 도구의 **로컬 `.env`에만** 둔다(사이트·GitHub에 절대 포함 금지).
- **신뢰성 원칙:** 무인 자동화로 조용히 실패하게 두지 말 것. 분석은 **사람이 지켜보며 생성·검수**하고, 검수 통과분만 사이트에서 published 한다. status는 `draft`까지만 자동, `published`는 어드민이 사이트에서 수동.

---

## 1. 이 단계의 목표 (Definition of Done)

- [ ] `agent/` 폴더: 보고서 템플릿 · `md_to_html.js` · `report-theme.css` · pull/push 스크립트
- [ ] 로컬 `.env`에 SUPABASE_URL + service_role (로컬 전용)
- [ ] 워크플로우 동작: **intake 자료 가져오기 → 9섹션 분석(필요시 웹검색) → md→html → Supabase 푸시(status=draft)**
- [ ] 어드민이 사이트에서 검토 후 게시 → 회원 열람·다운로드 확인

---

## 2. 작업 순서 (Tasks)

### T1. agent 폴더 & 스크립트
1. `agent/report_template.md` — **부록 A** 9섹션 스켈레톤.
2. `agent/report-theme.css` — 깔끔한 보고서 스타일 + `@media print`(인쇄/PDF 저장 대응). 외부 폰트/추적기 미사용.
3. `agent/md_to_html.js` — **부록 C** 스크립트(자가완결형 HTML 생성).
4. `agent/pull.(js|sh)` — Supabase에서 status=`intake` 레코드 1건의 PDF를 로컬로 내려받기(service_role, REST 또는 supabase CLI).
5. `agent/push.(js|sh)` — `report.md`→`reports-md`, `report.html`→`reports-html` 업로드 후 해당 `reports` 행을 `intake`→`draft`로 갱신(title·company·period·summary·model_used='claude-code'·web_search_used 채움).

### T2. 로컬 .env (분석 도구 전용)
```ini
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # 로컬 전용, 커밋 금지
# ANTHROPIC_API_KEY 는 설정하지 말 것
```
**[사용자에게 요청·정지]** SUPABASE_URL과 service_role 키를 사용자가 직접 `.env`에 넣도록 안내. `.gitignore`에 `.env*` 확인.

### T3. 분석 규칙 적용 (부록 B 준수)
- 파이프라인 P1~P6, 자료→섹션 매핑(예: DART), 품질기준(사실/추정 구분·출처표기·면책·**인물 얼굴/신상 검색 금지**)을 그대로 따른다.

---

## 3. 운영 루프 (이 단계 이후 반복 사용)
1. 어드민이 **사이트**(`/admin/reports/new`)에서 분석 자료 업로드 → status=`intake`.
2. Claude Code에서 `/status` 확인 후: **"Supabase의 분석대기(intake) 자료 가져와서 9섹션 투자검토보고서 만들어줘. 산업 시장규모·경쟁구도·최근 M&A는 웹검색해서 채워줘."**
3. Claude Code가 생성한 보고서를 **사람이 검수**(사실/추정·출처·면책 확인).
4. `push` 실행 → Supabase에 저장, status=`draft`.
5. 어드민이 **사이트 어드민 콘솔**에서 검토 후 **게시(publish)** → 승인 회원 열람·다운로드.

---

## 부록 A — 보고서 9섹션 템플릿 (`agent/report_template.md`)

```markdown
# (주){회사명}({영문약호}) 투자 검토 보고서 (v1.0)

**작성일:** {YYYY-MM-DD}
**작성목적:** 투자 의사결정용 종합 검토 자료
**대상:** 투자위원회(IC) 부의자료
**원천자료:** 사용자 제공 자료(예: {YYYY}년 {분기}분기보고서 등) + 공개자료

---

## 0. Executive Summary
### 0.1 대상 개요  ### 0.2 핵심 투자 포인트(One-liner) ### 0.3 잠정 의견(Base/Bull/Bear) ### 0.4 핵심 변수 Top 5
## 1. 산업 분석
### 1.1 시장 규모·성장률(웹검색 출처) ### 1.2 메가트렌드 ### 1.3 경쟁구도(Tier·포지셔닝) ### 1.4 거시·규제·통상 리스크 ### 1.5 동종 M&A 밸류에이션 벤치마크
## 2. 회사 분석
### 2.1 회사 개요(예: DART I장) ### 2.2 비즈니스 모델(매출구성·역량·인증/특허, 예: II장) ### 2.3 재무 심층진단(BS/IS/원가/주석, 예: III장) ### 2.4 운영상태 진단
## 3. 강점  ### 3.1 자산 ### 3.2 IP·인증 ### 3.3 전략적 위치 ### 3.4 거래구조
## 4. 리스크  ### 4.1 사업 ### 4.2 재무 ### 4.3 운영 ### 4.4 거래구조 ### 4.5 리스크 매트릭스
## 5. 밸류에이션  ### 5.1 자산가치(주력) ### 5.2 DCF(보조) ### 5.3 시장배수(참조) ### 5.4 가격 가이드라인
## 6. 실사 체크리스트(법무/재무/사업·운영/HR/시장/거버넌스)
## 7. 자료요청리스트 IRL(코드·자료명·우선순위)
## 8. 인수 후 100일 PMI(Day 1–30 / 31–60 / 61–100)
## 9. 최종 의견(한 줄 결론 / 가중 점수표 / 권고)

---
*본 보고서는 공개 자료 및 사용자 제공 자료를 기반으로 한 정보 제공용 자료이며, 투자자문·권유가 아닙니다. 모든 투자 판단과 책임은 이용자 본인에게 있습니다.*
```

---

## 부록 B — 분석 파이프라인 · 자료 매핑 · 품질기준

**파이프라인:** P1 추출(PDF 텍스트·표·수치) → P2 회사진단(자료 섹션→보고서 §2) → P3 산업 보강(웹검색) → P4 벤치마크(웹검색 M&A·EV/Sales) → P5 종합(강점/리스크/매트릭스/점수) → P6 산출(md→html).

**자료→섹션 매핑(예: 업로드 자료가 DART 분기보고서인 경우):** I장→§2.1 · II장→§1·§2.2 · III장(재무·주석)→§2.3·§5 · 결손금/차입금/담보 주석→§5·§6 · "보고기간 후 사건"→§0·§4 · VII/VIII(주주·임원)→§2·§4 · IX(계열)→§4.

**웹검색 항목:** `"{업종} 시장규모"` · `"{업종} 성장률 CAGR"` · `"{업종} 경쟁사 점유율"` · `"{업종} 규제"` · `"{업종} M&A 거래금액"` · `"EV/Sales {업종}"` · `"{회사명} 뉴스/소송/리콜/제재"`. **단, 인물 얼굴·신상 추적 검색 금지.**

**품질기준(★):**
- 모든 수치를 (a)자료원천 (b)웹검색출처 (c)추정(가정 명시)로 분류. 추정은 "추정/가정" 표기.
- 자료에 없는 값을 사실로 단정 금지 → 모르면 "자료 입수 필요" 또는 IRL(§7)로 이관.
- 웹검색 데이터·M&A 사례는 출처 명기, 원문 장문 복제 금지(자체 문장 재서술).
- 보고서 말미 면책문 고정. 임원 정보는 공시 범위 내.

---

## 부록 C — MD→HTML 변환 스크립트 (`agent/md_to_html.js`)

```js
// 실행: node agent/md_to_html.js report.md report.html
const fs = require('fs');
const MarkdownIt = require('markdown-it');           // npm i markdown-it
const md = new MarkdownIt({ html:false, linkify:true, typographer:true });
const [, , inPath, outPath] = process.argv;
const body = md.render(fs.readFileSync(inPath, 'utf8'));
const css = fs.readFileSync(__dirname + '/report-theme.css', 'utf8');
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>투자검토보고서</title><style>${css}</style></head>
<body><main class="report">${body}</main></body></html>`;
fs.writeFileSync(outPath, html);
console.log('생성 완료:', outPath);
```
요건: GFM 표·체크박스·각주 렌더, CSS 인라인 임베드(자가완결형), 외부 스크립트/추적기 미포함.

---

## ✅ 이 단계 완료 후
사용자에게 **"2단계 완료. 사이트에서 자료 업로드 → Claude Code에서 분석 → 게시까지 한 번 시연해 보시겠어요?"** 라고 안내한다.
