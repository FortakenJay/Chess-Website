-- Evidence-backed opening commentary, resumable generation jobs, and shared factual caches.
-- reason_text stays the short drill prompt. Structured teaching lives in commentary jsonb.

ALTER TABLE public.opening_nodes
  ADD COLUMN commentary jsonb;

ALTER TABLE public.openings
  ADD COLUMN generator_version integer,
  ADD COLUMN pack_key text,
  ADD COLUMN generation_status text CHECK (
    generation_status IS NULL OR generation_status IN (
      'starter',
      'generating',
      'ready',
      'paused',
      'error'
    )
  );

CREATE INDEX openings_pack_key_idx ON public.openings (pack_key)
  WHERE pack_key IS NOT NULL;

CREATE TABLE public.opening_explorer_cache (
  fen text NOT NULL,
  corpus text NOT NULL CHECK (corpus IN ('club', 'masters')),
  rating_band text NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fen, corpus, rating_band)
);

CREATE TABLE public.opening_packs (
  pack_key text PRIMARY KEY,
  opening_name text NOT NULL,
  side text NOT NULL CHECK (side IN ('w', 'b')),
  rating_band text NOT NULL,
  generator_version integer NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.opening_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  username text,
  pack_key text NOT NULL,
  opening_id uuid REFERENCES public.openings (id) ON DELETE CASCADE,
  opening_name text NOT NULL,
  side text NOT NULL CHECK (side IN ('w', 'b')),
  generator_version integer NOT NULL,
  rating_band text NOT NULL DEFAULT '1600-1800',
  requested_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  stage text NOT NULL DEFAULT 'queued' CHECK (
    stage IN (
      'queued',
      'starter',
      'explorer',
      'engine',
      'commentary',
      'milestones',
      'ready',
      'paused',
      'error'
    )
  ),
  cursor jsonb,
  done_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  error text,
  paused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX opening_generation_jobs_user_idx
  ON public.opening_generation_jobs (user_id, updated_at DESC);
CREATE INDEX opening_generation_jobs_opening_idx
  ON public.opening_generation_jobs (opening_id);

ALTER TABLE public.opening_explorer_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY opening_explorer_cache_select ON public.opening_explorer_cache
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY opening_packs_select ON public.opening_packs
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY opening_generation_jobs_select ON public.opening_generation_jobs
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR username = public.linked_username()
  );

CREATE POLICY opening_generation_jobs_insert ON public.opening_generation_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (username IS NULL OR username = public.linked_username())
  );

CREATE POLICY opening_generation_jobs_update ON public.opening_generation_jobs
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY opening_generation_jobs_delete ON public.opening_generation_jobs
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT ON public.opening_explorer_cache TO anon, authenticated;
GRANT SELECT ON public.opening_packs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opening_generation_jobs TO authenticated;
