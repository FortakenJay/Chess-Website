-- Previous unused capture-device table from this project; 0 rows.
DROP TABLE IF EXISTS public.games CASCADE;

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  chess_com_username text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sync_state (
  username text PRIMARY KEY,
  last_synced_at timestamptz,
  last_game_end_time bigint
);

CREATE TABLE public.flagged_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  played_on date NOT NULL,
  opponent text NOT NULL,
  color text NOT NULL CHECK (color IN ('white', 'black')),
  move_number integer NOT NULL,
  san text NOT NULL,
  loss integer NOT NULL,
  classification text NOT NULL CHECK (classification IN ('blunder', 'mistake', 'inaccuracy')),
  phase text NOT NULL CHECK (phase IN ('opening', 'middlegame', 'endgame')),
  clock_left integer,
  fen_before text NOT NULL,
  game_link text NOT NULL,
  motif text CHECK (
    motif IN (
      'hanging_piece',
      'fork',
      'pin',
      'skewer',
      'discovered_attack',
      'back_rank',
      'missed_mate'
    )
  ),
  UNIQUE (username, game_link, move_number)
);

CREATE TABLE public.period_summary (
  username text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_moves integer NOT NULL,
  blunder_pct numeric NOT NULL,
  mistake_pct numeric NOT NULL,
  by_phase jsonb NOT NULL DEFAULT '{}'::jsonb,
  by_color jsonb NOT NULL DEFAULT '{}'::jsonb,
  by_clock jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (username, period_start, period_end)
);

CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  played_on date NOT NULL,
  opponent text NOT NULL,
  color text NOT NULL CHECK (color IN ('white', 'black')),
  result text NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  blunder_count integer NOT NULL DEFAULT 0,
  mistake_count integer NOT NULL DEFAULT 0,
  inaccuracy_count integer NOT NULL DEFAULT 0,
  total_moves integer NOT NULL DEFAULT 0,
  phase_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  clock_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  game_link text NOT NULL,
  UNIQUE (username, game_link)
);

CREATE TABLE public.drill_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  position_id uuid NOT NULL REFERENCES public.flagged_positions (id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  matched_best boolean NOT NULL,
  matched_historical_mistake boolean NOT NULL
);

CREATE INDEX flagged_positions_username_idx ON public.flagged_positions (username);
CREATE INDEX flagged_positions_username_motif_idx ON public.flagged_positions (username, motif);
CREATE INDEX flagged_positions_username_class_idx ON public.flagged_positions (username, classification);
CREATE INDEX games_username_played_on_idx ON public.games (username, played_on);
CREATE INDEX drill_attempts_username_attempted_idx ON public.drill_attempts (username, attempted_at DESC);
CREATE INDEX period_summary_username_idx ON public.period_summary (username, period_start);

CREATE OR REPLACE FUNCTION public.linked_username()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT p.chess_com_username
  FROM public.profiles AS p
  WHERE p.user_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.linked_username() TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flagged_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drill_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX drill_attempts_position_id_idx ON public.drill_attempts (position_id);

CREATE POLICY sync_state_select ON public.sync_state
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY sync_state_insert ON public.sync_state
  FOR INSERT TO authenticated
  WITH CHECK (username = public.linked_username());
CREATE POLICY sync_state_update ON public.sync_state
  FOR UPDATE TO authenticated
  USING (username = public.linked_username())
  WITH CHECK (username = public.linked_username());
CREATE POLICY sync_state_delete ON public.sync_state
  FOR DELETE TO authenticated
  USING (username = public.linked_username());

CREATE POLICY flagged_positions_select ON public.flagged_positions
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY flagged_positions_insert ON public.flagged_positions
  FOR INSERT TO authenticated
  WITH CHECK (username = public.linked_username());
CREATE POLICY flagged_positions_update ON public.flagged_positions
  FOR UPDATE TO authenticated
  USING (username = public.linked_username())
  WITH CHECK (username = public.linked_username());
CREATE POLICY flagged_positions_delete ON public.flagged_positions
  FOR DELETE TO authenticated
  USING (username = public.linked_username());

CREATE POLICY period_summary_select ON public.period_summary
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY period_summary_insert ON public.period_summary
  FOR INSERT TO authenticated
  WITH CHECK (username = public.linked_username());
CREATE POLICY period_summary_update ON public.period_summary
  FOR UPDATE TO authenticated
  USING (username = public.linked_username())
  WITH CHECK (username = public.linked_username());
CREATE POLICY period_summary_delete ON public.period_summary
  FOR DELETE TO authenticated
  USING (username = public.linked_username());

CREATE POLICY games_select ON public.games
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY games_insert ON public.games
  FOR INSERT TO authenticated
  WITH CHECK (username = public.linked_username());
CREATE POLICY games_update ON public.games
  FOR UPDATE TO authenticated
  USING (username = public.linked_username())
  WITH CHECK (username = public.linked_username());
CREATE POLICY games_delete ON public.games
  FOR DELETE TO authenticated
  USING (username = public.linked_username());

CREATE POLICY drill_attempts_select ON public.drill_attempts
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY drill_attempts_insert ON public.drill_attempts
  FOR INSERT TO authenticated
  WITH CHECK (username = public.linked_username());

GRANT SELECT ON public.sync_state, public.flagged_positions, public.period_summary, public.games, public.drill_attempts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sync_state, public.flagged_positions, public.period_summary, public.games TO authenticated;
GRANT INSERT ON public.drill_attempts TO authenticated;
