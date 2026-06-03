-- ============================================================
-- Proposal Pipeline v2: 5-phase quality-controlled generation
-- New statuses: input → analyzing → planning → generating → ready → delivered
-- New columns: extraction_json, plan_md, qa_report
-- ============================================================

-- 1. Drop old status constraint, add new 6-value constraint
ALTER TABLE public.proposals
  DROP CONSTRAINT IF EXISTS proposals_status_check;

ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_status_check
  CHECK (status IN ('input','analyzing','planning','generating','ready','delivered'));

-- 2. New columns
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS extraction_json  TEXT,      -- P1 출력: 수치+출처 JSON
  ADD COLUMN IF NOT EXISTS plan_md          TEXT,      -- P2 출력: 슬라이드별 기획안
  ADD COLUMN IF NOT EXISTS plan_approved_at TIMESTAMPTZ, -- 사람 승인 시각
  ADD COLUMN IF NOT EXISTS qa_report        JSONB,     -- P4 출력: 슬라이드별 QA 점수
  ADD COLUMN IF NOT EXISTS qa_passed        BOOLEAN,   -- 전체 QA 통과 여부
  ADD COLUMN IF NOT EXISTS md_path          TEXT,      -- MD Storage 경로 (기존 누락분 보완)
  ADD COLUMN IF NOT EXISTS html_path        TEXT;      -- HTML Storage 경로

-- 3. startAnalysis action 을 위한 helper: input→analyzing 전환
-- (사이트 Server Action 에서 직접 UPDATE 하므로 함수 불필요 — 메모용)
