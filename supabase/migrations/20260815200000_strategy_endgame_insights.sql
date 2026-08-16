-- Strategy / endgame insight aggregates + rating-band peer RPCs.

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS strategy_stats jsonb,
  ADD COLUMN IF NOT EXISTS endgame_accuracy_stats jsonb,
  ADD COLUMN IF NOT EXISTS analysis_version integer;

COMMENT ON COLUMN public.games.strategy_stats IS
  'Per-structure RMS accuracy buckets for strategy themes.';
COMMENT ON COLUMN public.games.endgame_accuracy_stats IS
  'RMS accuracy buckets for endgame themes.';
COMMENT ON COLUMN public.games.analysis_version IS
  'Persisted analysis schema version. Null means the row predates strategy/endgame insights.';

CREATE INDEX IF NOT EXISTS games_username_analysis_version_idx
  ON public.games (username, analysis_version);
CREATE INDEX IF NOT EXISTS games_user_rating_idx
  ON public.games (user_rating)
  WHERE user_rating IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_time_class(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN value IS NULL OR btrim(value) = '' THEN 'unknown'
    WHEN lower(value) LIKE '%bullet%' OR value = '60' OR value LIKE '1|%' THEN 'bullet'
    WHEN lower(value) LIKE '%blitz%' OR value LIKE '3|%' OR value LIKE '5|%' THEN 'blitz'
    WHEN lower(value) LIKE '%rapid%' OR value LIKE '10|%' OR value LIKE '15|%' THEN 'rapid'
    WHEN lower(value) LIKE '%daily%' OR lower(value) LIKE '%correspondence%' THEN 'daily'
    ELSE lower(value)
  END
$$;

CREATE OR REPLACE FUNCTION public.strategy_peer_stats(
  viewed_username text,
  p_time_class text DEFAULT NULL,
  p_structure text DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  structure text := CASE
    WHEN p_structure IN ('all', 'open', 'closed', 'semi_closed') THEN p_structure
    ELSE 'all'
  END;
  viewer_rating numeric;
  result jsonb;
BEGIN
  SELECT AVG(g.user_rating) INTO viewer_rating
  FROM public.games AS g
  WHERE g.username = lower(viewed_username)
    AND g.user_rating IS NOT NULL
    AND (
      p_time_class IS NULL
      OR public.normalize_time_class(g.time_class) = p_time_class
    );

  IF viewer_rating IS NULL THEN
    RETURN jsonb_build_object('players', 0, 'metrics', '{}'::jsonb);
  END IF;

  WITH cohort AS (
    SELECT g.username, g.strategy_stats
    FROM public.games AS g
    WHERE g.username <> lower(viewed_username)
      AND g.user_rating IS NOT NULL
      AND abs(g.user_rating - viewer_rating) <= 100
      AND g.analysis_version = 1
      AND g.strategy_stats IS NOT NULL
      AND (
        p_time_class IS NULL
        OR public.normalize_time_class(g.time_class) = p_time_class
      )
  ),
  counted AS (
    SELECT COUNT(DISTINCT cohort.username)::integer AS players
    FROM cohort
  ),
  summed AS (
    SELECT
      m.metric,
      SUM(COALESCE((c.strategy_stats -> structure -> m.metric ->> 'moves')::numeric, 0)) AS moves,
      SUM(COALESCE((c.strategy_stats -> structure -> m.metric ->> 'squaredError')::numeric, 0)) AS squared_error
    FROM cohort AS c
    CROSS JOIN (
      VALUES
        ('activePiece'),
        ('attacking'),
        ('defending'),
        ('overall'),
        ('pawnStructure'),
        ('space')
    ) AS m(metric)
    GROUP BY m.metric
  )
  SELECT jsonb_build_object(
    'players', counted.players,
    'metrics', COALESCE(
      (
        SELECT jsonb_object_agg(
          summed.metric,
          jsonb_build_object(
            'moves', summed.moves,
            'pct', CASE
              WHEN counted.players >= 5 AND summed.moves >= 100
                THEN ROUND((100 - SQRT(summed.squared_error / NULLIF(summed.moves, 0)))::numeric, 1)
              ELSE NULL
            END
          )
        )
        FROM summed
      ),
      '{}'::jsonb
    )
  )
  INTO result
  FROM counted;

  RETURN COALESCE(result, jsonb_build_object('players', 0, 'metrics', '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.endgame_peer_stats(
  viewed_username text,
  p_time_class text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  viewer_rating numeric;
  result jsonb;
BEGIN
  SELECT AVG(g.user_rating) INTO viewer_rating
  FROM public.games AS g
  WHERE g.username = lower(viewed_username)
    AND g.user_rating IS NOT NULL
    AND (
      p_time_class IS NULL
      OR public.normalize_time_class(g.time_class) = p_time_class
    );

  IF viewer_rating IS NULL THEN
    RETURN jsonb_build_object('players', 0, 'win', '{}'::jsonb, 'accuracy', '{}'::jsonb);
  END IF;

  WITH cohort AS (
    SELECT g.username, g.endgame_conversion, g.endgame_accuracy_stats
    FROM public.games AS g
    WHERE g.username <> lower(viewed_username)
      AND g.user_rating IS NOT NULL
      AND abs(g.user_rating - viewer_rating) <= 100
      AND g.analysis_version = 1
      AND (
        p_time_class IS NULL
        OR public.normalize_time_class(g.time_class) = p_time_class
      )
  ),
  counted AS (
    SELECT COUNT(DISTINCT cohort.username)::integer AS players
    FROM cohort
  ),
  win_summed AS (
    SELECT
      e.entry,
      SUM(COALESCE((c.endgame_conversion -> e.entry ->> 'games')::numeric, 0)) AS games,
      SUM(COALESCE((c.endgame_conversion -> e.entry ->> 'wins')::numeric, 0)) AS wins
    FROM cohort AS c
    CROSS JOIN (VALUES ('better'), ('equal'), ('worse')) AS e(entry)
    GROUP BY e.entry
  ),
  acc_summed AS (
    SELECT
      t.theme,
      SUM(COALESCE((c.endgame_accuracy_stats -> t.theme ->> 'moves')::numeric, 0)) AS moves,
      SUM(COALESCE((c.endgame_accuracy_stats -> t.theme ->> 'squaredError')::numeric, 0)) AS squared_error
    FROM cohort AS c
    CROSS JOIN (VALUES ('pawn'), ('rook'), ('queen'), ('other'), ('overall')) AS t(theme)
    GROUP BY t.theme
  )
  SELECT jsonb_build_object(
    'players', counted.players,
    'win', COALESCE(
      (
        SELECT jsonb_object_agg(
          win_summed.entry,
          jsonb_build_object(
            'games', win_summed.games,
            'pct', CASE
              WHEN counted.players >= 5 AND win_summed.games >= 100
                THEN ROUND((100 * win_summed.wins / NULLIF(win_summed.games, 0))::numeric, 1)
              ELSE NULL
            END
          )
        )
        FROM win_summed
      ),
      '{}'::jsonb
    ),
    'accuracy', COALESCE(
      (
        SELECT jsonb_object_agg(
          acc_summed.theme,
          jsonb_build_object(
            'moves', acc_summed.moves,
            'pct', CASE
              WHEN counted.players >= 5 AND acc_summed.moves >= 100
                THEN ROUND((100 - SQRT(acc_summed.squared_error / NULLIF(acc_summed.moves, 0)))::numeric, 1)
              ELSE NULL
            END
          )
        )
        FROM acc_summed
      ),
      '{}'::jsonb
    )
  )
  INTO result
  FROM counted;

  RETURN COALESCE(
    result,
    jsonb_build_object('players', 0, 'win', '{}'::jsonb, 'accuracy', '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_time_class(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_time_class(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.strategy_peer_stats(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.strategy_peer_stats(text, text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.endgame_peer_stats(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.endgame_peer_stats(text, text) TO anon, authenticated;
