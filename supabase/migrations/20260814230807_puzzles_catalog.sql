-- Shared puzzle catalog for filterable practice (Lichess + Chess.com).

CREATE TABLE public.puzzles (
  id text PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('lichess', 'chesscom')),
  rating integer,
  fen text NOT NULL,
  solution jsonb NOT NULL DEFAULT '[]'::jsonb,
  themes text[] NOT NULL DEFAULT '{}'::text[],
  phase text NOT NULL CHECK (phase IN ('opening', 'middlegame', 'endgame')),
  motif text CHECK (
    motif IS NULL OR motif IN (
      'hanging_piece',
      'fork',
      'pin',
      'skewer',
      'discovered_attack',
      'back_rank',
      'missed_mate',
      'missed_fork',
      'missed_pin',
      'missed_skewer',
      'missed_discovered_attack',
      'missed_hanging_piece',
      'missed_back_rank'
    )
  ),
  color text NOT NULL CHECK (color IN ('white', 'black')),
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX puzzles_filters_idx ON public.puzzles (phase, motif, color, source);
CREATE INDEX puzzles_source_rating_idx ON public.puzzles (source, rating);

ALTER TABLE public.puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY puzzles_select ON public.puzzles
  FOR SELECT TO anon, authenticated
  USING (true);

-- Writes go through the service-role server path (import / fetch-more upsert).
-- No INSERT/UPDATE policies for anon/authenticated — service role bypasses RLS.
GRANT SELECT ON public.puzzles TO anon, authenticated;
