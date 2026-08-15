-- Extended analysis metrics + omission motifs + filter dimensions.

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS quality_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS acpl numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accuracy_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phase_acpl jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS endgame_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS endgame_conversion jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS recovery_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS opening_eco text,
  ADD COLUMN IF NOT EXISTS opening_name text,
  ADD COLUMN IF NOT EXISTS time_class text,
  ADD COLUMN IF NOT EXISTS opponent_rating integer,
  ADD COLUMN IF NOT EXISTS user_rating integer;

ALTER TABLE public.flagged_positions
  DROP CONSTRAINT IF EXISTS flagged_positions_motif_check;

ALTER TABLE public.flagged_positions
  ADD CONSTRAINT flagged_positions_motif_check CHECK (
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
  );

ALTER TABLE public.flagged_positions
  ADD COLUMN IF NOT EXISTS quality text,
  ADD COLUMN IF NOT EXISTS motif_kind text,
  ADD COLUMN IF NOT EXISTS endgame_type text,
  ADD COLUMN IF NOT EXISTS time_class text;

ALTER TABLE public.flagged_positions
  DROP CONSTRAINT IF EXISTS flagged_positions_quality_check;
ALTER TABLE public.flagged_positions
  ADD CONSTRAINT flagged_positions_quality_check CHECK (
    quality IS NULL OR quality IN ('inaccuracy', 'mistake', 'blunder')
  );

ALTER TABLE public.flagged_positions
  DROP CONSTRAINT IF EXISTS flagged_positions_motif_kind_check;
ALTER TABLE public.flagged_positions
  ADD CONSTRAINT flagged_positions_motif_kind_check CHECK (
    motif_kind IS NULL OR motif_kind IN ('commission', 'omission')
  );

ALTER TABLE public.flagged_positions
  DROP CONSTRAINT IF EXISTS flagged_positions_endgame_type_check;
ALTER TABLE public.flagged_positions
  ADD CONSTRAINT flagged_positions_endgame_type_check CHECK (
    endgame_type IS NULL OR endgame_type IN ('pawn', 'minor', 'rook', 'queen', 'mixed')
  );

CREATE INDEX IF NOT EXISTS flagged_positions_username_kind_idx
  ON public.flagged_positions (username, motif_kind);
CREATE INDEX IF NOT EXISTS flagged_positions_username_endgame_idx
  ON public.flagged_positions (username, endgame_type);
CREATE INDEX IF NOT EXISTS games_username_time_class_idx
  ON public.games (username, time_class);
CREATE INDEX IF NOT EXISTS games_username_eco_idx
  ON public.games (username, opening_eco);
