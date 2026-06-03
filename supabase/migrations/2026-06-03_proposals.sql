-- ============================================================
-- 투자요청서 자동생성 시스템 — 초기 스키마
-- Supabase Project: zvvbzmndemrwdcfjewog
-- Run: node --env-file=.env.proposal migrate-proposal.js
-- ============================================================

-- profiles: Supabase Auth 사용자 프로필
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID    PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email       TEXT,
  role        TEXT    NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  status      TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- profiles: self read — 본인 프로필 조회 허용
CREATE POLICY "profiles: self read" ON public.profiles FOR SELECT USING (auth.uid() = id);
-- 어드민 정책은 무한 재귀를 피하기 위해 schema.sql의 SECURITY DEFINER 함수(is_admin())로 처리
-- "profiles: admin read" / "profiles: admin update" 는 의도적으로 제외

-- proposals: 투자요청서 레코드
CREATE TABLE IF NOT EXISTS public.proposals (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 회사 기본 정보
  company_name        TEXT    NOT NULL,
  company_reg_no      TEXT,
  ceo_name            TEXT,
  -- 사업 개요
  project_name        TEXT,
  project_desc        TEXT,
  -- 딜 조건
  total_cost          BIGINT,           -- 총사업비 (원)
  funding_amount      BIGINT,           -- 조달요청액 (원)
  funding_type        TEXT    DEFAULT 'PF' CHECK (funding_type IN ('PF','equity','mezzanine','기타')),
  interest_rate       TEXT,             -- 예상금리 (협의 전이면 '[TBD]')
  tenor_months        INTEGER,          -- 대출기간 (개월)
  -- 추가 메모
  notes               TEXT,
  -- 상태
  status              TEXT    NOT NULL DEFAULT 'input'
    CHECK (status IN ('input','generating','ready','delivered')),
  -- 출력물
  pptx_path           TEXT,             -- proposals-pptx 버킷 경로
  -- 첨부파일
  source_attachments  JSONB   DEFAULT '[]'::jsonb,
  -- 선택 슬라이드 (기본: 전체)
  selected_slides     JSONB   DEFAULT '["1","2","3","4","5","6","7","8","9","10","11","12","A"]'::jsonb,
  -- 메타
  model_used          TEXT,
  error_message       TEXT,
  created_by          UUID    REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals: admin all" ON public.proposals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.status = 'approved')
);

-- 인덱스
CREATE INDEX IF NOT EXISTS proposals_status_created ON public.proposals (status, created_at);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- profiles 자동 생성 트리거 (신규 가입 시)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, status)
  VALUES (NEW.id, NEW.email, 'member', 'pending')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Storage Buckets (Supabase Dashboard 에서 수동 생성 필요)
-- 1. proposals-attachments  (Private)
--    - 사용자가 업로드한 PDF/Excel/이미지
--    - Policy: admin INSERT + SELECT
-- 2. proposals-pptx          (Private)
--    - 생성된 PPTX 파일
--    - Policy: admin SELECT (INSERT는 service_role 전용)
-- ============================================================
