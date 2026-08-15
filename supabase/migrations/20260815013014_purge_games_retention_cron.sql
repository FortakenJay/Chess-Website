-- Auto-remove analyzed games (and related rows) older than the retention window.
-- Matches GAME_RETENTION_YEARS = 2 in the app sync layer.

CREATE OR REPLACE FUNCTION public.purge_expired_games(retention_years integer DEFAULT 2)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff date := (CURRENT_DATE - make_interval(years => retention_years))::date;
  scope text := public.linked_username();
  drills integer := 0;
  flagged integer := 0;
  games_n integer := 0;
  periods integer := 0;
BEGIN
  IF retention_years IS NULL OR retention_years < 1 THEN
    RAISE EXCEPTION 'retention_years must be >= 1';
  END IF;

  -- Authenticated callers only purge their linked username.
  -- Cron / service_role (no linked profile) purge all users.

  DELETE FROM public.drill_attempts da
  USING public.flagged_positions fp
  WHERE da.position_id = fp.id
    AND fp.played_on < cutoff
    AND (scope IS NULL OR fp.username = scope);
  GET DIAGNOSTICS drills = ROW_COUNT;

  DELETE FROM public.flagged_positions fp
  WHERE fp.played_on < cutoff
    AND (scope IS NULL OR fp.username = scope);
  GET DIAGNOSTICS flagged = ROW_COUNT;

  DELETE FROM public.games g
  WHERE g.played_on < cutoff
    AND (scope IS NULL OR g.username = scope);
  GET DIAGNOSTICS games_n = ROW_COUNT;

  DELETE FROM public.period_summary ps
  WHERE ps.period_end < cutoff
    AND (scope IS NULL OR ps.username = scope);
  GET DIAGNOSTICS periods = ROW_COUNT;

  RETURN jsonb_build_object(
    'cutoff', cutoff,
    'scope', scope,
    'drill_attempts', drills,
    'flagged_positions', flagged,
    'games', games_n,
    'period_summary', periods
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_games(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_games(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_games(integer) TO service_role;

-- Daily cleanup (Supabase pg_cron).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-games-daily') THEN
    PERFORM cron.unschedule('purge-expired-games-daily');
  END IF;
  PERFORM cron.schedule(
    'purge-expired-games-daily',
    '15 4 * * *',
    $cron$SELECT public.purge_expired_games(2)$cron$
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Local / environments without cron still get the callable function.
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END;
$$;
