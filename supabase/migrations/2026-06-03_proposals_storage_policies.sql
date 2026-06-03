-- ============================================================
-- Storage Bucket RLS Policies for Proposal Files
-- Buckets must already exist in Supabase Dashboard:
--   proposals-pptx (Private)
--   proposals-md   (Private)
--   proposals-html (Private)
--   proposals-attachments (Private)
-- ============================================================

-- Helper: admin check (avoids recursive profile lookup)
CREATE OR REPLACE FUNCTION public.is_proposal_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
  );
$$;

-- ── proposals-pptx ──────────────────────────────────────────
-- Admin: SELECT (createSignedUrl)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'proposals-pptx: admin select'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "proposals-pptx: admin select"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'proposals-pptx' AND public.is_proposal_admin());
    $p$;
  END IF;
END $$;

-- ── proposals-md ────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'proposals-md: admin select'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "proposals-md: admin select"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'proposals-md' AND public.is_proposal_admin());
    $p$;
  END IF;
END $$;

-- ── proposals-html ──────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'proposals-html: admin select'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "proposals-html: admin select"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'proposals-html' AND public.is_proposal_admin());
    $p$;
  END IF;
END $$;

-- ── proposals-attachments ───────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'proposals-attachments: admin select'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "proposals-attachments: admin select"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'proposals-attachments' AND public.is_proposal_admin());
    $p$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'proposals-attachments: admin insert'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "proposals-attachments: admin insert"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'proposals-attachments' AND public.is_proposal_admin());
    $p$;
  END IF;
END $$;
