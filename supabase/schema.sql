-- =====================================================================
-- Investment Proposal v2 — Supabase Schema (1단계)
-- Apply this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Idempotency: 이 파일은 1회 실행 전제. 재실행 시 충돌하면 해당 객체부터 drop 후 재적용.
-- =====================================================================

-- ===== profiles =====
create table if not exists public.profiles (
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

-- ===== reports =====
create table if not exists public.reports (
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
create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null, content text,
  author_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.board_posts(id) on delete cascade,
  author_id uuid references public.profiles(id),
  content text, created_at timestamptz default now()
);

create table if not exists public.audit_log (
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

-- profiles policies
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select
  using (id=auth.uid() or public.is_admin());

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update
  using (id=auth.uid());

drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles" on public.profiles for update
  using (public.is_admin());

-- reports policies
drop policy if exists "members read published" on public.reports;
create policy "members read published" on public.reports for select
  using (status='published' and public.is_approved());

drop policy if exists "admin all reports" on public.reports;
create policy "admin all reports" on public.reports for all
  using (public.is_admin()) with check (public.is_admin());

-- board_posts policies
drop policy if exists "approved read posts" on public.board_posts;
create policy "approved read posts" on public.board_posts for select
  using (public.is_approved());

drop policy if exists "approved write posts" on public.board_posts;
create policy "approved write posts" on public.board_posts for insert
  with check (public.is_approved() and author_id=auth.uid());

drop policy if exists "author edit posts" on public.board_posts;
create policy "author edit posts" on public.board_posts for update
  using (author_id=auth.uid() or public.is_admin());

drop policy if exists "author delete posts" on public.board_posts;
create policy "author delete posts" on public.board_posts for delete
  using (author_id=auth.uid() or public.is_admin());

-- comments policies
drop policy if exists "approved read comments" on public.comments;
create policy "approved read comments" on public.comments for select
  using (public.is_approved());

drop policy if exists "approved write comments" on public.comments;
create policy "approved write comments" on public.comments for insert
  with check (public.is_approved() and author_id=auth.uid());

drop policy if exists "author manage comments" on public.comments;
create policy "author manage comments" on public.comments for all
  using (author_id=auth.uid() or public.is_admin());

-- =====================================================================
-- Storage policies (버킷은 대시보드에서 Private로 먼저 생성: reports-md / reports-html / reports-pdf)
-- =====================================================================

-- reports-md
drop policy if exists "approved read md" on storage.objects;
create policy "approved read md" on storage.objects for select
  using (bucket_id='reports-md' and public.is_approved());

drop policy if exists "admin write md" on storage.objects;
create policy "admin write md" on storage.objects for insert
  with check (bucket_id='reports-md' and public.is_admin());

-- reports-html
drop policy if exists "approved read html" on storage.objects;
create policy "approved read html" on storage.objects for select
  using (bucket_id='reports-html' and public.is_approved());

drop policy if exists "admin write html" on storage.objects;
create policy "admin write html" on storage.objects for insert
  with check (bucket_id='reports-html' and public.is_admin());

-- reports-pdf
drop policy if exists "approved read pdf" on storage.objects;
create policy "approved read pdf" on storage.objects for select
  using (bucket_id='reports-pdf' and public.is_approved());

drop policy if exists "admin write pdf" on storage.objects;
create policy "admin write pdf" on storage.objects for insert
  with check (bucket_id='reports-pdf' and public.is_admin());

-- =====================================================================
-- 최초 어드민 승격 (사용자가 본인 이메일로 회원가입 한 후, 1회 실행)
-- 아래 your-email-here@example.com 을 본인 이메일로 바꿔서 실행:
-- =====================================================================
-- update public.profiles set role='admin', status='approved' where email='your-email-here@example.com';
