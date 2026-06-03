-- daemon_heartbeat: 데몬 생존 확인용 단일 행 테이블
CREATE TABLE IF NOT EXISTS public.daemon_heartbeat (
  id          TEXT PRIMARY KEY DEFAULT 'proposal-daemon',
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  pid         INTEGER,
  version     TEXT
);

ALTER TABLE public.daemon_heartbeat ENABLE ROW LEVEL SECURITY;

-- 어드민만 읽기 가능
CREATE POLICY "daemon_heartbeat: admin read"
  ON public.daemon_heartbeat FOR SELECT TO authenticated
  USING (public.is_proposal_admin());

-- service_role 로 쓰기 (daemon)
-- INSERT 초기 행
INSERT INTO public.daemon_heartbeat (id) VALUES ('proposal-daemon')
  ON CONFLICT (id) DO NOTHING;
