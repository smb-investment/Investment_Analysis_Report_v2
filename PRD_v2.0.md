# PRD — 투자분석 리포트 플랫폼 (IR-Agent) v2.0

> **문서 유형:** Product Requirements Document (단독 자립 문서 — 이 문서 하나로 전체 설계·빌드·운영을 다룬다)
> **핵심:** 어드민이 사이트에서 **분석 대상 자료(사용자가 업로드 — 예: DART 분기보고서 등 PDF)**를 업로드 → **Claude Code(구독제)**에서 9섹션 투자검토보고서 생성 → 사이트에서 검토·게시 → 승인 회원이 열람·다운로드.
> **스택:** Claude Code(빌드+분석, 구독제) · Supabase · GitHub · Vercel
> **불변식:** *"구독제 로그인 도구(Claude Code)에서 분석, 배포된 사이트는 Claude 미호출."* Claude Code 작업 시 `ANTHROPIC_API_KEY` 미설정 확인(`/status`).

---

## 1. 배경 & 문제정의

**사용자가 업로드한 분석 자료**(예: DART 분기보고서 등 기업 공시·재무·IR 자료, 주로 PDF)를 받아 표준 9섹션 투자검토보고서로 만들어 회원에게 게시·다운로드 제공하는 플랫폼이 필요하다. 과거 유료 API 기반 자동 분석 시스템은 ① 비용 과다(분석이 길어 1일 수십 달러) ② 무인 파이프라인의 조용한 실패(보고서 미생성)로 폐기했다. 본 프로젝트는 **구독제만 사용**하고 **사람이 검수하는 신뢰성 있는 흐름**으로 재설계한다.

### 1.1 어드민이 원하는 동선 (Use Case) — A1Smart 구조 준거

A1Smart(부동산 매물 시스템)의 "관리자 업로드 → 분석 → 회원 게시" 구조를 그대로 본뜨되, 도메인은 **기업 투자검토보고서**(사용자가 업로드한 자료 — 예: DART 분기보고서 등 — 기반)로 한다.

1. **[사이트] 자료수집 업로드** — 어드민 콘솔에서 **분석 대상 자료(예: DART 분기보고서 등 PDF + 보조자료)**를 업로드한다. → Supabase에 저장, 보고서 레코드 status=`intake`(분석대기). **이 단계는 파일 저장뿐, Claude 미호출 → 비용 0.** (A1Smart "단계 1: 자료수집"과 동일 역할)
2. **[Claude Code] 분석·생성** — Claude Code에서 "Supabase의 분석대기 자료 가져와 보고서 만들어줘"라고 지시 → Code가 자료를 내려받아 9섹션 보고서 생성(필요 시 웹검색). **Claude Code는 구독제로 작동(API 키 미설정 시) → 추가 비용 0.**
3. **[Code→Supabase] 푸시** — 보고서 MD/HTML을 Supabase로 푸시, status=`draft`.
4. **[사이트] 검토 후 게시** — 어드민이 사이트에서 검토 후 **게시(publish)** → 승인 회원이 열람/다운로드.

> **신뢰성 원칙(★):** 분석은 Claude Code에서 **사람이 지켜보며 생성·검수한 뒤** 게시한다. 무인 자동 파이프라인이 조용히 실패해 "보고서 미생성"이 나는 일을 막는다. 보고서는 검토를 통과해야만 published 된다.
>
> **⚠️ 비용 안전장치:** Claude Code 환경에 `ANTHROPIC_API_KEY`가 설정돼 있으면 구독제가 아니라 유료 API로 과금된다. 작업 전 `/status`로 구독(Pro/Max) 로그인 상태를 반드시 확인한다.

---

## 2. 결정적 제약 & 아키텍처 확정

### 2.1 제약 (변경 불가)

- **구독제(Pro/Max)는 배포된 웹사이트에서 프로그램적으로 호출할 수 없다.** 구독제는 Anthropic 앱(Claude.ai / Claude Code) 내 로그인 대화형 사용에만 적용된다.
- 웹사이트가 직접 Claude를 호출하려면 **유료 API**(토큰 과금 + 웹검색 1,000회당 $10)가 강제된다 → **본 프로젝트에서 배제.**
- 따라서 분석·생성은 어드민의 **로그인 도구(Claude Code, 구독제)**에서만 수행하고, 배포된 사이트는 Claude를 호출하지 않는다.

### 2.2 확정 아키텍처 — "분석 도구(Claude Code) / 전달 사이트" 분리

| 레이어 | 책임 | 구현/도구 | Claude 사용 |
|--------|------|-----------|-------------|
| **A. 분석 도구** | Supabase 분석대기 자료 받기 → 웹검색 → 9섹션 보고서 생성 → MD/HTML 산출 → Supabase 푸시 | **Claude Code (구독제, API 키 미설정)** | ✅ 구독제 |
| **B. 백엔드** | 인증·회원·보고서 메타·게시판·Storage·RLS | **Supabase** | 없음 |
| **C. 회원제 사이트** | 로그인·자료수집 업로드·보고서 목록/뷰어·다운로드·게시판·어드민 관리 | **Next.js (App Router), Claude Code로 빌드** | 없음 |
| **D. 배포** | GitHub → Vercel 자동배포 | **Vercel** | 없음 |

> **원칙:** 사이트(C)는 Claude를 절대 호출하지 않는다 → 사이트에 어떤 Claude 키도 두지 않는다. 생성은 전부 Claude Code(A)에서 끝난다.
>
> **경계선:** "내 도구(Claude Code) = 구독제 OK" vs "배포된 웹사이트 = 구독제 불가(호출 시 유료 API)". 분석을 Code에서 하는 것과 사이트가 Claude를 호출하는 것은 전혀 다르다.

### 2.3 아키텍처 다이어그램

```
[어드민]
   │  ① 사이트에서 분석 자료 업로드(자료수집, 예: 분기보고서 등 PDF) — Claude 미호출, 비용 0
   ▼
┌──────────────────────────────────────────────┐
│  B. Supabase  (Auth · DB · Storage · RLS)       │
│     PDF 저장 + reports row(status=intake 분석대기) │
└──────▲────────────────────────────┬────────────┘
       │ ③ 보고서 MD/HTML 푸시          │ ② "분석대기 자료 가져와 만들어줘"
       │   (status=draft)             ▼   (PDF 내려받기)
┌──────┴─────────────────────────────────────────┐
│  A. Claude Code  (구독제, API 키 미설정)          │
│   • PDF 분석 → (필요시) 웹검색                     │
│   • 9섹션 보고서.md → md_to_html → .html          │
│   • Supabase로 푸시                               │
└─────────────────────────────────────────────────┘
                        │ (Supabase 경유)
                        ▼
┌──────────────────────────────────────────────┐
│  C. 회원제 사이트 (Next.js, Vercel)              │
│   login · 자료수집 업로드 · reports · viewer ·    │
│   download · board · admin                       │
└──────────────────────────────────────────────┘
   ▲                         ▲
   │ ④ 검토 후 게시(publish)   │ ⑤ 로그인·열람·다운로드·게시판
[어드민]                    [승인 회원]
```

---

## 3. 목표 & 비목표

### 3.1 목표 (Goals)
- 어드민이 사이트에서 PDF 업로드(자료수집) → **Claude Code에서 분석·생성**(구독제) → 사이트에서 검토 후 **게시**.
- 승인 회원이 보고서를 **HTML 뷰어로 열람 + MD/PDF 다운로드**.
- **게시판**으로 회원 간 토론.
- **구독제만 사용**(추가 API 과금 0), 사람이 검수하는 신뢰성.

### 3.2 비목표 (Non-Goals)
- 사이트 내 실시간 Claude 호출(업로드→사이트가 직접 생성) — **API 강제되므로 제외.**
- 회원의 보고서 자가 생성 — 생성은 어드민 전용.
- 모바일 네이티브 앱 — 웹 반응형으로 충분.

---

## 4. 사용자 & 권한

| 페르소나 | 권한 | 주요 행위 |
|----------|------|-----------|
| **어드민** | admin | 사이트에서 자료 업로드·게시 토글·회원 승인·게시판 관리, Claude Code에서 분석·생성·푸시 |
| **승인 회원** | member / approved | 게시 보고서 열람·다운로드, 게시판 읽기·쓰기 |
| **미승인/방문자** | pending / 없음 | 가입만 가능, 콘텐츠 접근 불가 |

---

## 5. 기능 요건 (User Stories + Acceptance Criteria)

### 5.A 분석·생성 (Claude Code, 구독제)

**US-A1. 분석대기 자료 가져오기**
- *As an* 어드민, *I want* Claude Code에 "Supabase의 분석대기(intake) 자료 가져와 보고서 만들어줘"라고 지시, *so that* 사이트가 받아둔 자료로 분석이 시작된다.
- **AC:** Code가 Supabase에서 status=`intake` 레코드의 자료를 내려받아 파이프라인 P1~P2(추출·회사진단) 수행. (부록 C)

**US-A2. 필요 시 웹검색**
- *I want* "이 산업 시장규모/경쟁사/최근 M&A 검색해줘"라고 요청, *so that* §1·§5가 최신 근거로 채워진다.
- **AC:** 구독제 웹검색으로 P3·P4 수행, 출처 표기, **인물 얼굴·신상 추적 검색 금지**(부록 C 품질기준).

**US-A3. 9섹션 보고서 생성**
- **AC:** 부록 A 템플릿(9섹션) 준수 → `report.md` 생성 → `md_to_html.js`로 `report.html`(자가완결형) 생성. 부록 C 품질기준 자체 점검(사실/추정 구분, 출처, 면책문 포함).

**US-A4. Supabase로 푸시**
- **AC:** `report.md`→`reports-md`, `report.html`→`reports-html`, 원본 PDF→`reports-pdf` 버킷 저장, 해당 `reports` 행 status를 `intake`→`draft`로 갱신(메타 채움). **service_role 키는 Claude Code 로컬 .env에만 존재(사이트·GitHub 비포함).**

### 5.B 회원제 사이트 (Next.js, Claude Code 빌드)

**US-B0. 자료수집 업로드 (어드민)** — *A1Smart "단계 1: 자료수집"에 해당*
- *As an* 어드민, *I want* `/admin/reports/new`에서 **분석 대상 자료(예: DART 분기보고서 등 PDF + 보조자료)**를 업로드, *so that* 분석 대기열에 들어간다.
- **AC:** 사용자 업로드 자료 허용(PDF 권장, 각 ≤20MB) → `reports-pdf` 버킷 저장 + `reports` 행 insert(status=`intake`, company·period 메타). **이 단계는 파일 저장뿐 — Claude 미호출.**

**US-B1. 회원가입 & 승인제**
- **AC:** 이메일/비번 가입 → `profiles`(role=member, status=pending) 자동 생성 → "승인 대기" 안내. 어드민 승인 후에만 접근.

**US-B2. 로그인 & 라우트 가드**
- **AC:** 미로그인/미승인 사용자는 보호 라우트 진입 시 로그인으로 리다이렉트(`middleware.ts` 서버 가드).

**US-B3. 보고서 목록**
- **AC:** status=`published` 보고서만 표시(회사명·기간·요약·작성일). 검색/필터(회사·기간) 지원.

**US-B4. 보고서 뷰어 + 다운로드**
- **AC:** `html_path` → Storage **signed URL**(만료 ≤ 5분)로 본문 렌더. "MD 다운로드"·"PDF 다운로드"는 각 경로의 단기 signed URL 발급. "인쇄(→PDF 저장)" 버튼은 print CSS 적용.

**US-B5. 게시판**
- **AC:** 승인 회원 목록·작성·댓글. 작성자/어드민만 수정·삭제. 본문 XSS 이스케이프.

**US-B6. 어드민 관리 콘솔**
- **AC:** ① 회원 승인/거부(`profiles.status`, `audit_log` 기록) ② 보고서 게시 토글(draft↔published) ③ 자료수집 업로드(US-B0) ④ 게시판 모더레이션.

### 5.C 공통 비기능 요건
- **보안:** 사이트에 Claude 키 없음. anon key만 노출(RLS 보호). service_role은 Claude Code 로컬 전용. 인증 가드·signed URL 발급은 서버(Server Component/Route Handler)에서 처리.
- **개인정보:** 회원 이메일 최소 수집, 임원 정보는 공시 범위 내.
- **컴플라이언스:** 모든 보고서·사이트 푸터에 "정보제공용·투자자문 아님·판단 책임은 이용자" 면책 고정(부록 A 면책문).
- **성능:** 보고서 HTML 자가완결형 단일 파일 렌더, 목록 페이지네이션.
- **비용:** 구독제만 사용 → 토큰·검색 추가 과금 0. (제약은 구독제 사용량 한도뿐 — 갑작스런 청구 없음)

---

## 6. 데이터 모델 (Supabase)

- 테이블: `profiles · reports · board_posts · comments · audit_log` — 전체 DDL은 **부록 B**.
- `reports.status` 값: `intake`(분석대기) → `draft`(분석완료, 미게시) → `published`(게시).
- Storage 버킷: `reports-md · reports-html · reports-pdf` (모두 Private + signed URL).
- RLS: published 보고서는 approved 회원만 읽기, admin은 전체 — **부록 B** 정책.

---

## 7. 빌드 계획 (Claude Code)

### M1 — 백엔드 (Claude Code 또는 Supabase 콘솔)
- [ ] Supabase 프로젝트 생성(Seoul), 키 확보(사용자 본인)
- [ ] 부록 B SQL(테이블 + RLS + 버킷 정책) 적용
- [ ] 최초 어드민 SQL 승격

### M2 — 사이트 빌드 (Claude Code)
- [ ] Next.js(App Router) 페이지: index/login · reports · report/[id] · board · post/[id] · board-new · admin · **admin/reports/new(자료수집)**
- [ ] `@supabase/ssr` 세션 처리 + `middleware.ts` 보호 라우트 가드
- [ ] anon key만 클라이언트, 로그인→가드→목록→뷰어→게시판→어드민→자료수집 흐름 검증

### M3 — 배포 (Claude Code → GitHub → Vercel)
- [ ] GitHub 푸시(비밀키 0 확인, 시크릿 스캔)
- [ ] Vercel Import(Next.js 자동 감지)
- [ ] Supabase Auth Redirect URL에 Vercel 도메인 등록

### M4 — 분석 셋업 (1회) & 운영(반복)
- [ ] Claude Code 작업 폴더에 `agent/`(report_template.md·md_to_html.js·push 스크립트) 배치
- [ ] 로컬 `.env`에 SUPABASE_URL + service_role 키(로컬 전용)
- [ ] **운영 루프(반복):** 사이트에서 PDF 업로드 → Claude Code에서 `/status` 확인 후 "분석대기 자료 만들어줘" → 검수 → 푸시 → 사이트에서 게시 ON

---

## 8. 리스크 & 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 유료 API로 의도치 않게 과금 | 비용 폭증(과거 사례) | Claude Code에서 `/status` 확인, `ANTHROPIC_API_KEY` 미설정 유지 |
| service_role 키 유출 | 데이터 위험 | Claude Code 로컬 .env에만, GitHub `.gitignore`, 사이트 미포함 |
| 무인 파이프라인 조용한 실패 | 보고서 미생성 | 분석은 사람이 검수, published는 검토 통과분만 |
| 보고서 할루시네이션 | 신뢰도 | 부록 C: 사실/추정 구분·출처표기·자료요청(IRL) 이관 강제 |
| 대형·다수 업로드 자료 처리 | 생성 지연 | Claude Code 다단계 처리, 섹션별 분할 생성 |
| 구독제 사용량 한도 | 일시 작업 정지 | 생성 배치 시간 분산, 플랜 한도 모니터링(청구 폭증은 없음) |

---

## 9. 향후 확장 (Out of Scope, 차기)
- 신규 공시 자동 감지 → 분석 큐 적재(여전히 검수 후 게시).
- 보고서 버전관리(v1↔v2 diff)·열람 로그·워터마크.
- 회원 알림(신규 게시 메일), 영문 IC 메모 출력.

---

# 부록 A — 보고서 표준 템플릿 (9섹션 스켈레톤)

```markdown
# (주){회사명}({영문약호}) 투자 검토 보고서 (v1.0)

**작성일:** {YYYY-MM-DD}
**작성목적:** 투자 의사결정용 종합 검토 자료
**대상:** 투자위원회(IC) 부의자료
**원천자료:** 사용자 제공 자료(예: {YYYY}년 {분기}분기보고서 등) + 공개자료

---

## 0. Executive Summary
### 0.1 대상 개요  (대상회사/업종/거래구조/소재지/자본총계/핵심자산 표)
### 0.2 핵심 투자 포인트 (One-liner)  > "…"
### 0.3 잠정 투자 의견  (Base / Bull / Bear 표)
### 0.4 핵심 의사결정 변수 (Top 5)

## 1. 산업 분석
### 1.1 시장 규모 및 성장률 (글로벌/국내, CAGR)   ← 웹검색 출처표기
### 1.2 산업 메가트렌드
### 1.3 경쟁 구도 (Tier 표 / 대상사 포지셔닝)
### 1.4 거시·규제·통상 환경 리스크
### 1.5 동종 M&A 밸류에이션 벤치마크 (EV/Sales 등)

## 2. 회사 분석
### 2.1 회사 개요 (예: DART I장)
### 2.2 비즈니스 모델 (매출구성·핵심역량·인증/특허)  (예: DART II장)
### 2.3 재무 심층 진단 (BS/IS/원가/주석)  (예: DART III장)
### 2.4 운영 상태 진단 (정상기 vs 현재 vs 복원난이도)

## 3. 강점 (Strengths)
### 3.1 자산 기반  ### 3.2 IP·인증  ### 3.3 전략적 위치  ### 3.4 거래구조

## 4. 리스크 (Risks)
### 4.1 사업  ### 4.2 재무  ### 4.3 운영  ### 4.4 거래구조
### 4.5 리스크 매트릭스 (발생가능성 × 영향도)

## 5. 밸류에이션
### 5.1 자산가치 접근(주력)  ### 5.2 수익가치 DCF(보조)
### 5.3 시장배수(참조)  ### 5.4 가격 결정 가이드라인

## 6. 실사 체크리스트 (법무/재무/사업·운영/HR/시장/거버넌스)
## 7. 자료요청리스트 IRL (코드·자료명·우선순위 표)
## 8. 인수 후 100일 PMI (Day 1–30 / 31–60 / 61–100)
## 9. 최종 의견 (한 줄 결론 / 가중 점수표 / 권고사항)

---
*본 보고서는 공개 자료 및 사용자 제공 자료를 기반으로 작성된 정보 제공용 자료이며, 투자자문·권유가 아닙니다. 모든 투자 판단과 그 책임은 이용자 본인에게 있습니다. §7 자료 입수 후 추가 실사를 통해 의사결정을 확정해야 합니다.*
```

---

# 부록 B — Supabase SQL (테이블 + RLS + Storage)

```sql
-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('admin','member')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

-- 가입 시 프로필 자동 생성
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

-- ===== reports =====
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  title text,
  company text, ticker text, period text,
  summary text,
  status text not null default 'intake' check (status in ('intake','draft','published')),
  md_path text, html_path text, pdf_path text,
  model_used text,                                  -- 예: 'claude-code'
  web_search_used boolean default false,
  source_filing text,                               -- 예: 'KS인더스트리 2026 1Q'
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ===== board =====
create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null, content text,
  author_id uuid references public.profiles(id),
  created_at timestamptz default now()
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.board_posts(id) on delete cascade,
  author_id uuid references public.profiles(id),
  content text, created_at timestamptz default now()
);
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid, action text, target text, created_at timestamptz default now()
);

-- ===== RLS =====
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.board_posts enable row level security;
alter table public.comments enable row level security;

create or replace function public.is_admin() returns boolean
language sql security definer stable as $$
  select exists(select 1 from public.profiles
    where id = auth.uid() and role='admin' and status='approved');
$$;
create or replace function public.is_approved() returns boolean
language sql security definer stable as $$
  select exists(select 1 from public.profiles
    where id = auth.uid() and status='approved');
$$;

-- profiles
create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "own profile update" on public.profiles for update using (id = auth.uid());
create policy "admin manage profiles" on public.profiles for update using (public.is_admin());

-- reports
create policy "members read published" on public.reports
  for select using (status='published' and public.is_approved());
create policy "admin all reports" on public.reports
  for all using (public.is_admin()) with check (public.is_admin());

-- board
create policy "approved read posts" on public.board_posts for select using (public.is_approved());
create policy "approved write posts" on public.board_posts for insert with check (public.is_approved() and author_id = auth.uid());
create policy "author edit posts" on public.board_posts for update using (author_id = auth.uid() or public.is_admin());
create policy "author delete posts" on public.board_posts for delete using (author_id = auth.uid() or public.is_admin());

create policy "approved read comments" on public.comments for select using (public.is_approved());
create policy "approved write comments" on public.comments for insert with check (public.is_approved() and author_id = auth.uid());
create policy "author manage comments" on public.comments for all using (author_id = auth.uid() or public.is_admin());

-- 최초 어드민 승격(본인 uid로 1회 실행)
-- update public.profiles set role='admin', status='approved' where email='you@example.com';

-- ===== Storage 버킷 (reports-md / reports-html / reports-pdf 동일 패턴) =====
-- insert into storage.buckets (id,name,public) values ('reports-html','reports-html',false);
create policy "approved read html" on storage.objects for select
  using (bucket_id='reports-html' and public.is_approved());
create policy "admin write html" on storage.objects for insert
  with check (bucket_id='reports-html' and public.is_admin());
-- reports-pdf 는 어드민 업로드(자료수집) 위해 admin write 정책 동일 적용,
-- reports-md 도 동일 패턴 반복.
```

---

# 부록 C — 분석 파이프라인 · 자료 섹션 매핑(예: DART) · 품질기준 · 변환 스크립트

### C.1 분석 파이프라인 (6단계)

| 단계 | 작업 | 산출 |
|------|------|------|
| P1. 추출 | Supabase에서 받은 PDF에서 텍스트·표 추출, 핵심 수치 파싱(`pypdf` 등) | 원시 사실표 |
| P2. 회사 진단 | 업로드 자료의 섹션을 보고서 §2에 매핑(예: DART 분기보고서면 아래 표) | 회사분석 초안 |
| P3. 산업 보강 | 시장규모·성장률·경쟁구도·규제·거시 리스크 조사(웹검색) | 산업분석(§1) |
| P4. 벤치마크 | 동종 M&A/멀티플(EV/Sales 등) 수집(웹검색) | 밸류에이션 근거(§5) |
| P5. 종합 | 강점/리스크 도출, 리스크 매트릭스, 점수표 | §3·§4·§9 |
| P6. 산출 | report.md → md_to_html.js로 report.html | MD + HTML |

### C.2 자료 → 보고서 섹션 매핑 (예: 업로드 자료가 DART 분기보고서인 경우)

| 자료 섹션 (예: DART) | 보고서 반영 |
|-----------|-------------|
| I. 회사의 개요 | §2.1 회사 개요 |
| II. 사업의 내용 | §1 산업분석 + §2.2 비즈니스 모델/역량 |
| III. 재무(요약·BS·IS·CF·원가·주석) | §2.3 재무분석, §5 밸류에이션 |
| 주석: 결손금·이연법인세·차입금·담보 | §5 자산가치, §6 재무 체크리스트 |
| 주석 "보고기간 후 사건" | §0 핵심변수, §4 우발 리스크 |
| VII. 주주 / VIII. 임원·직원 | §2 지배구조·인력, §4 운영(인력) 리스크 |
| IX. 계열회사 | §4 관계사·내부거래 리스크 |

### C.3 웹검색 항목
- 산업: `"{업종} 시장규모"`, `"{업종} 성장률 CAGR"`, `"{업종} 경쟁사 점유율"`, `"{업종} 규제"`
- 거시: 환율·금리·통상(관세)·수출규제 등 매출구조 연동 변수
- 벤치마크: `"{업종} M&A 거래금액"`, `"EV/Sales {업종}"`
- 회사 이벤트: `"{회사명} 뉴스/소송/리콜/제재"` (단, **인물 얼굴·신상 추적 검색 금지**)

### C.4 품질 기준 & 금지사항 (★)
- **사실/추정 구분:** 모든 수치를 (a)공시원천 (b)웹검색출처 (c)추정(가정 명시) 으로 분류. 추정치는 "추정/가정" 표기.
- **할루시네이션 금지:** 공시에 없는 값을 사실로 단정 금지 → 모르면 "자료 입수 필요" 또는 IRL(§7)로 이관.
- **출처 표기:** 웹검색 데이터·M&A 사례는 출처 명기, 원문 장문 복제 금지(자체 문장 재서술).
- **투자자문 아님:** 보고서 말미 면책문 고정(부록 A).
- **개인정보:** 임원 보수·식별정보는 공시 범위 내, 얼굴·신상 추적 검색 금지.

### C.5 MD → HTML 변환 스크립트 (`agent/md_to_html.js`)

```js
// 실행: node agent/md_to_html.js report.md report.html
const fs = require('fs');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
const [, , inPath, outPath] = process.argv;
const body = md.render(fs.readFileSync(inPath, 'utf8'));
const css = fs.readFileSync(__dirname + '/report-theme.css', 'utf8'); // 인쇄 스타일 포함
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>투자검토보고서</title><style>${css}</style></head>
<body><main class="report">${body}</main></body></html>`;
fs.writeFileSync(outPath, html);
console.log('생성 완료:', outPath);
```
요건: GFM 표·체크박스·각주 렌더, CSS 인라인 임베드(자가완결형), 외부 스크립트/추적기 미포함.

---

# 부록 D — .env (분석 도구 로컬 전용)

```ini
# 사이트(공개 가능) — Next.js
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...     # 공개 OK (RLS가 보호)

# Claude Code 로컬 전용 — 절대 커밋 금지(.gitignore)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...          # 분석 결과 푸시용
# ANTHROPIC_API_KEY 는 설정하지 말 것 (설정 시 구독제 대신 유료 API 과금)
```

---

*핵심 한 줄: 분석·생성은 Claude Code(구독제), 사이트는 Claude Code로 빌드(배포된 사이트는 Claude 미호출). 어드민은 사이트에서 자료 업로드 → Claude Code에서 분석·생성 → 사이트에서 게시.*
