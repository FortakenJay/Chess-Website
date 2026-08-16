-- Opening trainer: repertoire tree, explorer stats, dual-score progress.
-- Moves come from repertoire PGN. Explorer fills deviation frequency.
-- LLM-authored fields live only on knowledge_card / reason_text (validated in app).

CREATE TABLE public.openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text,
  name text NOT NULL,
  eco text,
  side text NOT NULL CHECK (side IN ('w', 'b')),
  parent_id uuid REFERENCES public.openings (id) ON DELETE SET NULL,
  structure_family text,
  center_type text CHECK (
    center_type IS NULL OR center_type IN (
      'open', 'semi_open', 'closed', 'fixed', 'tense', 'fluid'
    )
  ),
  theory_load integer NOT NULL DEFAULT 2 CHECK (theory_load BETWEEN 1 AND 5),
  knowledge_card jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (username, name, side)
);

CREATE UNIQUE INDEX openings_shared_name_side_idx
  ON public.openings (name, side)
  WHERE username IS NULL;

CREATE TABLE public.opening_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_id uuid NOT NULL REFERENCES public.openings (id) ON DELETE CASCADE,
  parent_node_id uuid REFERENCES public.opening_nodes (id) ON DELETE CASCADE,
  fen text NOT NULL,
  ply integer NOT NULL CHECK (ply >= 0),
  san text NOT NULL DEFAULT '',
  is_mine boolean NOT NULL,
  source text NOT NULL DEFAULT 'repertoire' CHECK (source IN ('repertoire', 'explorer')),
  reason_tags text[] NOT NULL DEFAULT '{}'::text[],
  reason_text text,
  alternatives jsonb NOT NULL DEFAULT '[]'::jsonb,
  explorer_stats jsonb,
  frequency_weight real NOT NULL DEFAULT 1,
  UNIQUE NULLS NOT DISTINCT (opening_id, parent_node_id, san)
);

ALTER TABLE public.opening_nodes
  ADD CONSTRAINT opening_nodes_reason_tags_allowed
  CHECK (
    reason_tags <@ ARRAY[
      'develop',
      'control_square',
      'prophylaxis',
      'tempo_gain',
      'tempo_avoid',
      'break_prep',
      'break_stop',
      'structure_fix',
      'open_line',
      'king_safety',
      'target_create',
      'piece_reroute',
      'trade_favorable',
      'transposition_control'
    ]::text[]
  );

CREATE INDEX opening_nodes_opening_id_idx ON public.opening_nodes (opening_id);
CREATE INDEX opening_nodes_parent_idx ON public.opening_nodes (parent_node_id);
CREATE INDEX opening_nodes_opening_mine_idx ON public.opening_nodes (opening_id, is_mine)
  WHERE is_mine;
CREATE INDEX openings_parent_id_idx ON public.openings (parent_id);

CREATE TABLE public.structure_targets (
  opening_id uuid PRIMARY KEY REFERENCES public.openings (id) ON DELETE CASCADE,
  my_breaks text[] NOT NULL DEFAULT '{}'::text[],
  their_breaks text[] NOT NULL DEFAULT '{}'::text[],
  my_good_squares text[] NOT NULL DEFAULT '{}'::text[],
  their_good_squares text[] NOT NULL DEFAULT '{}'::text[],
  my_problem_piece text,
  their_problem_piece text,
  typical_endgame text,
  tempo_traps text[] NOT NULL DEFAULT '{}'::text[]
);

CREATE TABLE public.node_progress (
  node_id uuid NOT NULL REFERENCES public.opening_nodes (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recall_ease real NOT NULL DEFAULT 2.5,
  understanding_ease real NOT NULL DEFAULT 2.5,
  due_at timestamptz NOT NULL DEFAULT now(),
  last_recall_pass boolean,
  last_understanding_pass boolean,
  streak integer NOT NULL DEFAULT 0,
  lapses integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (node_id, user_id)
);

CREATE INDEX node_progress_user_due_idx ON public.node_progress (user_id, due_at);

ALTER TABLE public.openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structure_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY openings_select ON public.openings
  FOR SELECT TO anon, authenticated
  USING (username IS NULL OR username = public.linked_username());

CREATE POLICY openings_insert ON public.openings
  FOR INSERT TO authenticated
  WITH CHECK (username = public.linked_username());

CREATE POLICY openings_update ON public.openings
  FOR UPDATE TO authenticated
  USING (username = public.linked_username())
  WITH CHECK (username = public.linked_username());

CREATE POLICY openings_delete ON public.openings
  FOR DELETE TO authenticated
  USING (username = public.linked_username());

CREATE POLICY opening_nodes_select ON public.opening_nodes
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.openings AS o
      WHERE o.id = opening_id
        AND (o.username IS NULL OR o.username = public.linked_username())
    )
  );

CREATE POLICY opening_nodes_insert ON public.opening_nodes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.openings AS o
      WHERE o.id = opening_id
        AND o.username = public.linked_username()
    )
  );

CREATE POLICY opening_nodes_update ON public.opening_nodes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.openings AS o
      WHERE o.id = opening_id
        AND o.username = public.linked_username()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.openings AS o
      WHERE o.id = opening_id
        AND o.username = public.linked_username()
    )
  );

CREATE POLICY opening_nodes_delete ON public.opening_nodes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.openings AS o
      WHERE o.id = opening_id
        AND o.username = public.linked_username()
    )
  );

CREATE POLICY structure_targets_select ON public.structure_targets
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.openings AS o
      WHERE o.id = opening_id
        AND (o.username IS NULL OR o.username = public.linked_username())
    )
  );

CREATE POLICY structure_targets_insert ON public.structure_targets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.openings AS o
      WHERE o.id = opening_id
        AND o.username = public.linked_username()
    )
  );

CREATE POLICY structure_targets_update ON public.structure_targets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.openings AS o
      WHERE o.id = opening_id
        AND o.username = public.linked_username()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.openings AS o
      WHERE o.id = opening_id
        AND o.username = public.linked_username()
    )
  );

CREATE POLICY structure_targets_delete ON public.structure_targets
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.openings AS o
      WHERE o.id = opening_id
        AND o.username = public.linked_username()
    )
  );

CREATE POLICY node_progress_select ON public.node_progress
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY node_progress_insert ON public.node_progress
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY node_progress_update ON public.node_progress
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY node_progress_delete ON public.node_progress
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT ON public.openings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.openings TO authenticated;
GRANT SELECT ON public.opening_nodes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.opening_nodes TO authenticated;
GRANT SELECT ON public.structure_targets TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.structure_targets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.node_progress TO authenticated;
