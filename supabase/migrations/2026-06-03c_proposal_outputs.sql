-- Add output columns for MD and HTML
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS md_path TEXT,
  ADD COLUMN IF NOT EXISTS html_path TEXT;

-- Allow approved members to read ready/delivered proposals
DROP POLICY IF EXISTS "proposals: members read ready" ON public.proposals;
CREATE POLICY "proposals: members read ready" ON public.proposals
  FOR SELECT USING (
    status IN ('ready', 'delivered') AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'approved')
  );
