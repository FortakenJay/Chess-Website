ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS move_ep_losses jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS analysis_budget jsonb;

COMMENT ON COLUMN public.games.move_ep_losses IS
  'Expected-points loss for each user move, in game order.';
COMMENT ON COLUMN public.games.analysis_budget IS
  'Fixed Stockfish search budget used for every position in this analysis.';
