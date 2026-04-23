-- Invite-only beta access list for temporary controlled testing.
-- One row per tester email; platform admins can invite/revoke and monitor login activity.

CREATE TABLE IF NOT EXISTS public.beta_access_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['family', 'school', 'individual'],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  invited_by UUID REFERENCES public.profiles(id),
  note TEXT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_access_invites_status
  ON public.beta_access_invites(status);

CREATE INDEX IF NOT EXISTS idx_beta_access_invites_last_login
  ON public.beta_access_invites(last_login_at DESC NULLS LAST);

DROP TRIGGER IF EXISTS trg_beta_access_invites_updated ON public.beta_access_invites;
CREATE TRIGGER trg_beta_access_invites_updated
  BEFORE UPDATE ON public.beta_access_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.beta_access_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS beta_access_invites_select ON public.beta_access_invites;
CREATE POLICY beta_access_invites_select
  ON public.beta_access_invites
  FOR SELECT
  USING (
    public.is_platform_admin()
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS beta_access_invites_insert ON public.beta_access_invites;
CREATE POLICY beta_access_invites_insert
  ON public.beta_access_invites
  FOR INSERT
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS beta_access_invites_update ON public.beta_access_invites;
CREATE POLICY beta_access_invites_update
  ON public.beta_access_invites
  FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS beta_access_invites_delete ON public.beta_access_invites;
CREATE POLICY beta_access_invites_delete
  ON public.beta_access_invites
  FOR DELETE
  USING (public.is_platform_admin());
