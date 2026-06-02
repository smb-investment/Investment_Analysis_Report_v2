# Repository conventions for Claude Code (this repo)

이 저장소는 두 개의 분리된 시스템으로 구성됩니다.

1. **사이트(루트 + `app/`, `lib/`, `middleware.ts` 등)** — Next.js 14 App Router, Vercel 배포, Supabase 백엔드.
   회원제 투자 보고서 열람. **사이트 코드는 Claude API/Anthropic SDK 를 절대 호출하지 않습니다.**
   클라이언트는 `NEXT_PUBLIC_*` (anon key) 만 사용. service_role 키는 사이트/GitHub 에 존재하지 않습니다.
2. **분석 엔진(`agent/`)** — 로컬 전용 도구. Claude Code 구독제(Pro/Max)로 작동.
   사이트에서 PO 가 [분석 시작] 을 누른 `analyzing` 상태 보고서를 가져와 §0 + 선택된 §1~§9 를 작성해 `status=draft` 로 푸시.

---

## 🚨 헌법 (Constitution) — 반드시 준수

이 규칙은 사용자 명시 요청이 없는 한 절대 깨지 않습니다.

1. **API 키 사용 금지**: `ANTHROPIC_API_KEY` 환경변수가 설정된 상태에서는 분석을 시작하지 않는다.
   세션 시작 시 `/status` 로 구독 로그인을 먼저 확인하고, 키가 있으면 사용자에게 제거를 권한다.
2. **service_role 격리**: `agent/.env` 에만 존재한다. 사이트 코드/GitHub/Vercel env 에 절대 들어가지 않는다.
   분석 도구 안에서도 클라이언트 응답 등 외부로 노출되는 위치에 쓰지 않는다.
3. **사실/추정 분리**: 모든 수치는 (a)자료원천 (b)웹검색출처 (c)추정(가정 명시) 중 하나로 분류.
   자료에 없는 값을 사실로 단정하지 않는다. 모르면 IRL(§7)로 이관.
4. **출처 표기**: 웹검색 인용은 출처 명기, 원문 장문 복제 금지(자체 문장으로 재서술).
5. **인물 보호**: **인물의 얼굴·신상 추적 검색 금지.** 임원 정보는 공시 범위 내로 한정.
6. **면책문 고정**: 보고서 말미에 다음 문장 포함 —
   *본 보고서는 공개 자료 및 사용자 제공 자료를 기반으로 한 정보 제공용 자료이며, 투자자문·권유가 아닙니다. 모든 투자 판단과 책임은 이용자 본인에게 있습니다.*
7. **published 는 사이트에서만**: 분석 엔진은 `draft` 까지만 자동. `published` 토글은 어드민이 사이트에서 수동.
8. **사람이 지켜본다**: 무인 자동화로 조용히 실패하게 두지 않는다. 분석 후 사람 검수 단계가 반드시 있다.

---

## 분석 파이프라인 (P1–P6)

투자검토보고서 생성 시 다음 단계를 순서대로 수행한다.

| 단계 | 작업 | 산출물 |
|---|---|---|
| P1 추출 | 업로드된 PDF 의 텍스트·표·수치를 발췌 | 발췌 노트 |
| P2 회사진단 | 자료 섹션을 보고서 §2 로 매핑 | §2.1~§2.4 초안 |
| P3 산업 보강 | 웹검색으로 시장규모·CAGR·경쟁구도·규제 | §1.1~§1.4 |
| P4 벤치마크 | 동종 M&A 거래금액·EV/Sales 웹검색 | §1.5, §5.3 |
| P5 종합 | 강점·리스크·매트릭스·가중점수 도출 | §3, §4, §9.2 |
| P6 산출 | `report.md` 완성 → `md_to_html.js` 로 HTML 생성 | `report.md`, `report.html` |

## 자료 → 섹션 매핑 (예: DART 분기보고서)

| 원문 위치 | 보고서 섹션 |
|---|---|
| I장 | §2.1 회사 개요 |
| II장 | §1 산업분석, §2.2 비즈니스 모델 |
| III장 (재무·주석) | §2.3 재무 심층진단, §5 밸류에이션 |
| 결손금 / 차입금 / 담보 주석 | §5, §6 |
| "보고기간 후 사건" | §0 Executive Summary, §4 리스크 |
| VII / VIII (주주·임원) | §2, §4 |
| IX (계열) | §4 |

## 웹검색 쿼리 가이드

- `"{업종} 시장규모"` · `"{업종} 성장률 CAGR"` · `"{업종} 경쟁사 점유율"`
- `"{업종} 규제"` · `"{업종} M&A 거래금액"` · `"EV/Sales {업종}"`
- `"{회사명} 뉴스/소송/리콜/제재"`

**금지:** 인물 얼굴·신상 추적 검색.

---

## 운영 명령

보고서 1건의 생애주기는 다음 4단계 상태로 진행한다:
`intake` (자료수집) → `analyzing` (분석중) → `draft` (초안) → `published` (게시).

```powershell
# 1) 사이트의 /admin/reports/new 에서 PDF 업로드 (status=intake)

# 2) 사이트의 /admin 의 보고서 목록에서 [→ 분석 시작] 클릭
#    → 9섹션 체크박스 모달에서 작성할 §1~§9 선택 (§0 Exec Summary 는 항상 포함)
#    → status=analyzing, selected_sections 저장

# 3) 로컬에서 분석 대기 보고서 가져오기 (analyzing 1건)
node --env-file=agent/.env agent/pull.js

# 4) Claude Code 에서 분석:
#    "Supabase 의 분석중(analyzing) 자료 가져와서 meta.json 의 selected_sections 만 작성해줘.
#     산업 시장규모·경쟁구도·최근 M&A 는 웹검색해서 채워줘."
#    (Claude Code 가 agent/inbox/<reportId>/report.md 를 채움 — 미선택 섹션 헤더는 이미 제거됨)

# 5) 사람 검수 (사실/추정·출처·면책 확인) — 로컬 report.md 직접 편집

# 6) 사이트에 푸시
node --env-file=agent/.env agent/push.js <reportId> --web-search

# 7) 사이트 /admin 에서 draft → published 토글
```

### DB 마이그레이션 (1회성)

`supabase/migrations/` 에 새 SQL 이 추가되면 한 번만 적용:

```powershell
# agent/.env 에 SUPABASE_DB_PASSWORD 가 필요
# (Supabase Dashboard > Settings > Database > Database password)
cd agent
npm install                              # pg, supabase-js 의존성 (최초 1회만)
node --env-file=.env migrate.js          # 미적용 SQL 모두 순서대로 실행
```

---

## 환경 점검 (세션 시작 시 자동 수행)

- `ANTHROPIC_API_KEY` 미설정 확인
- `/status` 로 구독 로그인 확인 사용자에게 권유
- `agent/.env` 존재 + `SUPABASE_SERVICE_ROLE_KEY` 채워져 있는지
- `.gitignore` 가 `.env*`, `agent/inbox/` 를 무시하는지
