-- proposal_logs: 데몬 실시간 진행 로그
CREATE TABLE IF NOT EXISTS public.proposal_logs (
  id          BIGSERIAL PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  phase       TEXT,
  message     TEXT NOT NULL,
  ts          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposal_logs_proposal_id_idx ON public.proposal_logs(proposal_id, ts DESC);

ALTER TABLE public.proposal_logs ENABLE ROW LEVEL SECURITY;

-- 어드민만 읽기 가능
CREATE POLICY "proposal_logs: admin read"
  ON public.proposal_logs FOR SELECT TO authenticated
  USING (public.is_proposal_admin());

-- service_role 쓰기 (데몬이 INSERT)
-- (service_role bypasses RLS by default)

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposal_logs;
