-- Drop analyzed games (and related rows) older than the 2-year retention window.
-- Sync now only imports Chess.com months within the same window.

DELETE FROM public.drill_attempts da
USING public.flagged_positions fp
WHERE da.position_id = fp.id
  AND fp.played_on < (CURRENT_DATE - INTERVAL '2 years');

DELETE FROM public.flagged_positions
WHERE played_on < (CURRENT_DATE - INTERVAL '2 years');

DELETE FROM public.games
WHERE played_on < (CURRENT_DATE - INTERVAL '2 years');

DELETE FROM public.period_summary
WHERE period_end < (CURRENT_DATE - INTERVAL '2 years');
