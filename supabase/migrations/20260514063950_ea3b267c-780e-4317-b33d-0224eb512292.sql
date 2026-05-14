
-- Restrict SECURITY DEFINER functions to server-side roles only.
REVOKE ALL ON FUNCTION public._preppi_cron_headers() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- api_cache is intended to be accessed only by edge functions via the service role
-- (which bypasses RLS). Add explicit deny-all policies so the linter sees an
-- intentional access posture and any direct API access is blocked.
DROP POLICY IF EXISTS "Deny all access to api_cache" ON public.api_cache;
CREATE POLICY "Deny all access to api_cache"
  ON public.api_cache
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
