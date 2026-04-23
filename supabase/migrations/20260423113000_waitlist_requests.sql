-- Public waitlist submissions from marketing pages.

CREATE TABLE IF NOT EXISTS public.waitlist_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  role_requested TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'marketing_site',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_requests_created_at
  ON public.waitlist_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_waitlist_requests_email
  ON public.waitlist_requests(lower(email));

ALTER TABLE public.waitlist_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS waitlist_requests_select ON public.waitlist_requests;
CREATE POLICY waitlist_requests_select
  ON public.waitlist_requests
  FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS waitlist_requests_update ON public.waitlist_requests;
CREATE POLICY waitlist_requests_update
  ON public.waitlist_requests
  FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
