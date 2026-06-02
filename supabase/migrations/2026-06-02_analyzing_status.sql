-- Migration: add 'analyzing' status + selected_sections column
-- Applied on: 2026-06-02
-- Reason: Admin 에서 분석 시작 버튼 + 9섹션 선택 워크플로우 추가

-- 1) status CHECK 제약 갱신 (intake → analyzing → draft → published)
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check
  check (status in ('intake','analyzing','draft','published'));

-- 2) selected_sections 컬럼 추가 (기본 전체 9섹션)
alter table public.reports add column if not exists
  selected_sections jsonb default '["1","2","3","4","5","6","7","8","9"]'::jsonb;

-- 3) 기존 NULL 값에 디폴트 채우기 (이미 default 가 적용되지만 기존 행 보정)
update public.reports set selected_sections = '["1","2","3","4","5","6","7","8","9"]'::jsonb
 where selected_sections is null;
