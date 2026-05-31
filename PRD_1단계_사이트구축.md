# 【1단계】 백엔드 + 회원제 사이트 구축 & 배포 — Claude Code 빌드 지시서

> **사용법:** 이 파일 **전체를 복사해 Claude Code에 붙여넣으세요.** 이 단계가 끝나면 2단계 지시서를 붙여넣습니다.
> **이 단계의 결과물:** 배포된 회원제 사이트(가입·승인·로그인·보고서 열람/다운로드·게시판·어드민 콘솔) + Supabase 백엔드. (보고서 *내용 생성*은 2단계에서. 1단계에선 목록이 비어 있어도 정상)

---

## 0. Claude Code에게 (반드시 먼저 읽고 지킬 것)

- **불변식:** 이 사이트는 **Claude를 절대 호출하지 않는다.** 사이트 코드에 어떤 Claude/Anthropic 키도 넣지 않는다. 클라이언트엔 Supabase **anon key**만 쓴다(RLS가 보호). **service_role 키는 사이트·GitHub에 절대 넣지 않는다**(2단계 로컬 도구 전용).
- **스택:** **Next.js (App Router)** + `@supabase/ssr` + Supabase + Vercel. TypeScript.
- **보안/권한:** 계정 생성·비밀번호·키 입력 등은 **사용자가 직접** 해야 한다. 그런 입력이 필요한 지점에선 **작업을 멈추고 사용자에게 무엇을 어디에 넣어야 하는지 쉬운 말로 요청**하라(대신 입력하지 말 것).
- **⚠️ 과금 방지:** 시작 시 `/status`로 **구독(Pro/Max) 로그인** 상태인지 확인하라. `ANTHROPIC_API_KEY` 환경변수가 있으면 알려주고 제거를 권하라(있으면 유료 API로 과금됨).
- 저장소 루트에 사용자가 제공한 **`AGENTS.md` / `CLAUDE.md`**(정본 지침)를 두고 그 규칙을 따른다. 없으면 본 지시서 규칙을 따른다.
- 변경은 작게. 요청하지 않은 리팩터링 금지. 커밋 전 **시크릿 스캔**으로 키 노출 0 확인.

---

## 1. 이 단계의 목표 (Definition of Done)

- [ ] Supabase: 테이블·RLS·Storage 버킷 완비
- [ ] Next.js 사이트: 가입/승인제, 로그인 가드, 보고서 목록/뷰어/다운로드, 게시판, 어드민 콘솔(회원 승인·자료수집 업로드·게시 토글·게시판 관리)
- [ ] Vercel 배포 완료, 로그인~어드민 흐름 동작
- [ ] 사이트에 Claude 키 0 / service_role 키 0 확인

---

## 2. 작업 순서 (Tasks)

### T1. Supabase 백엔드
1. **[사용자에게 요청·정지]** "Supabase에서 프로젝트를 새로 만들고(리전: Northeast Asia/Seoul 권장), **Project URL · anon key · service_role key**를 알려주세요." — 사용자가 줄 때까지 대기.
2. 아래 **부록 A SQL**을 Supabase SQL Editor에 적용하도록 안내(또는 사용자가 붙여넣게 안내). 테이블 + RLS + Storage 정책 포함.
3. Storage 버킷 3개 생성: `reports-md` · `reports-html` · `reports-pdf` (모두 **Private**).
4. **[사용자에게 요청]** 최초 어드민 지정: 사용자가 사이트에서 본인 이메일로 가입한 뒤, 부록 A 맨 아래 `update ... set role='admin'` SQL을 본인 uid/email로 1회 실행하도록 안내.

### T2. Next.js 앱 (App Router)
1. `create-next-app`(TypeScript, App Router)로 프로젝트 생성. `@supabase/ssr` 설치.
2. `lib/supabase/`에 서버·클라이언트·미들웨어용 클라이언트 구성(`@supabase/ssr` 패턴).
3. `middleware.ts`: 보호 라우트(`/reports`, `/board`, `/admin` 등)에 **세션 + 승인상태 가드**. 미로그인/미승인 → `/login`.
4. 페이지 구현(각 AC 충족):

| 라우트 | 기능 | 접근 |
|--------|------|------|
| `/` 또는 `/login` | 랜딩 + 로그인/회원가입 | 공개 |
| `/reports` | status=`published` 목록(회사·기간·요약·작성일, 검색/필터) | 승인 회원 |
| `/reports/[id]` | 뷰어: `html_path`를 **signed URL(만료 ≤5분)**로 렌더 + MD/PDF 다운로드(단기 signed URL) + 인쇄 버튼 | 승인 회원 |
| `/board` | 게시판 목록 | 승인 회원 |
| `/board/[id]` | 글 + 댓글(작성/본인·admin 수정·삭제, XSS 이스케이프) | 승인 회원 |
| `/board/new` | 글쓰기 | 승인 회원 |
| `/admin` | 회원 승인/거부 · 보고서 게시 토글(draft↔published) · 게시판 모더레이션 | admin |
| `/admin/reports/new` | **자료수집 업로드**: 분석 대상 자료(예: DART 분기보고서 등 PDF, 각 ≤20MB) 업로드 → `reports-pdf` 저장 + `reports` insert(status=`intake`, company·period 메타). **Claude 미호출, 단순 저장** | admin |

5. **서버에서 처리할 것:** 인증 가드, RLS 조회, **signed URL 발급**은 Server Component/Route Handler/Server Action에서. 비밀은 클라이언트로 내려보내지 말 것.
6. 푸터에 면책 고정: "본 자료는 정보 제공 목적이며 투자자문·권유가 아닙니다. 투자 판단과 책임은 이용자 본인에게 있습니다."

### T3. 환경변수
- `.env.local` (사이트, 공개 가능): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **service_role 키는 여기 넣지 않는다.** `.gitignore`에 `.env*` 포함.

### T4. 배포 (GitHub → Vercel)
1. GitHub 레포 생성·푸시. **[정지]** 푸시 전 비밀키 노출 0 확인 후 사용자에게 GitHub 로그인/레포 생성 안내.
2. **[사용자에게 요청]** Vercel에서 이 레포 Import(Next.js 자동 감지). 환경변수(`NEXT_PUBLIC_*`) 입력은 사용자가.
3. **[사용자에게 요청]** Supabase 인증 설정의 **Site URL / Redirect URL**에 Vercel 도메인 등록.

### T5. (선택) 뷰어 테스트용 샘플
- 보고서가 아직 없으므로, 뷰어/다운로드 검증을 위해 임시 샘플 HTML 1건을 `reports-html`에 올리고 `reports`에 status=`published` 더미 행을 넣어 동작 확인 후 삭제. (2단계에서 실제 생성)

---

## 3. 멈춤 지점 요약 (사용자 직접 입력)
- Supabase 프로젝트 생성·키 발급
- 사이트 가입 후 어드민 승격 SQL 실행
- GitHub 로그인/레포, Vercel Import·환경변수 입력, Supabase Redirect URL 등록

---

## 부록 A — Supabase SQL (테이블 + RLS + Storage)

```sql
-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('admin','member')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);
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
  model_used text, web_search_used boolean default false,
  source_material text,
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
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='approved');
$$;
create or replace function public.is_approved() returns boolean
language sql security definer stable as $$
  select exists(select 1 from public.profiles where id=auth.uid() and status='approved');
$$;

create policy "own profile read" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "own profile update" on public.profiles for update using (id=auth.uid());
create policy "admin manage profiles" on public.profiles for update using (public.is_admin());

create policy "members read published" on public.reports for select using (status='published' and public.is_approved());
create policy "admin all reports" on public.reports for all using (public.is_admin()) with check (public.is_admin());

create policy "approved read posts" on public.board_posts for select using (public.is_approved());
create policy "approved write posts" on public.board_posts for insert with check (public.is_approved() and author_id=auth.uid());
create policy "author edit posts" on public.board_posts for update using (author_id=auth.uid() or public.is_admin());
create policy "author delete posts" on public.board_posts for delete using (author_id=auth.uid() or public.is_admin());

create policy "approved read comments" on public.comments for select using (public.is_approved());
create policy "approved write comments" on public.comments for insert with check (public.is_approved() and author_id=auth.uid());
create policy "author manage comments" on public.comments for all using (author_id=auth.uid() or public.is_admin());

-- Storage 정책 (reports-md / reports-html / reports-pdf 동일 패턴 반복)
-- 버킷은 대시보드에서 Private로 생성. 예(reports-html):
create policy "approved read html" on storage.objects for select
  using (bucket_id='reports-html' and public.is_approved());
create policy "admin write html" on storage.objects for insert
  with check (bucket_id='reports-html' and public.is_admin());
-- reports-pdf: 어드민 자료수집 업로드 위해 admin write 동일 적용
-- reports-md: 동일 패턴

-- 최초 어드민 승격(가입 후 1회, 본인 이메일로):
-- update public.profiles set role='admin', status='approved' where email='you@example.com';
```

---

## ✅ 이 단계 완료 후
사용자에게 **"1단계 완료. 사이트 주소와 어드민 로그인 확인되면 2단계 지시서를 붙여넣어 주세요."** 라고 보고하고 멈춘다.
