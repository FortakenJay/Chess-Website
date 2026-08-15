-- Puzzle catalog: public read only. Writes use service role (bypasses RLS).
DROP POLICY IF EXISTS puzzles_insert_service ON public.puzzles;
DROP POLICY IF EXISTS puzzles_update_service ON public.puzzles;

REVOKE INSERT, UPDATE, DELETE ON public.puzzles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.puzzles FROM anon;
GRANT SELECT ON public.puzzles TO anon, authenticated;

-- Profile link without client-supplied user_id (auth.uid() only).
CREATE OR REPLACE FUNCTION public.link_chess_username(p_username text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := (SELECT auth.uid());
  handle text := lower(trim(p_username));
  row public.profiles;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF handle IS NULL OR length(handle) < 2 OR length(handle) > 25 THEN
    RAISE EXCEPTION 'Invalid Chess.com username';
  END IF;

  INSERT INTO public.profiles (user_id, chess_com_username)
  VALUES (uid, handle)
  ON CONFLICT (user_id) DO UPDATE
    SET chess_com_username = EXCLUDED.chess_com_username
  RETURNING * INTO row;

  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.link_chess_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_chess_username(text) TO authenticated;
