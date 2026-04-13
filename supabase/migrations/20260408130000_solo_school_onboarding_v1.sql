-- Kelvi v1: solo org type, solo_learner role, school/solo bootstrap RPCs,
-- student_invitations + accept RPC, profiles.birth_date, can_access_student self-link.
-- Apply in Supabase SQL editor or via `supabase db push`.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date date;

COMMENT ON COLUMN public.profiles.birth_date IS 'Optional; solo onboarding sets this; 14+ enforced in bootstrap_solo_workspace.';

ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_type_check;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_type_check
  CHECK (type IN ('school', 'family', 'district', 'solo'));

ALTER TABLE public.org_memberships DROP CONSTRAINT IF EXISTS org_memberships_role_check;
ALTER TABLE public.org_memberships
  ADD CONSTRAINT org_memberships_role_check
  CHECK (role IN ('parent', 'family_admin', 'teacher', 'school_admin', 'solo_learner'));

CREATE TABLE IF NOT EXISTS public.student_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_invitations_token ON public.student_invitations(token);
CREATE INDEX IF NOT EXISTS idx_student_invitations_org_student ON public.student_invitations(org_id, student_id);

ALTER TABLE public.student_invitations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_student(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = target_student_id AND s.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.guardian_id = auth.uid()
        AND sg.student_id = target_student_id
    )
    OR EXISTS (
      SELECT 1 FROM public.classroom_teachers ct
      JOIN public.classroom_students cs ON ct.classroom_id = cs.classroom_id
      WHERE ct.profile_id = auth.uid()
        AND cs.student_id = target_student_id
    )
    OR EXISTS (
      SELECT 1 FROM public.org_memberships om
      JOIN public.student_org_assignments soa ON om.org_id = soa.org_id
      WHERE om.profile_id = auth.uid()
        AND om.role IN ('school_admin', 'family_admin')
        AND om.is_active = true
        AND soa.student_id = target_student_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships
    WHERE profile_id = auth.uid()
      AND org_id = target_org_id
      AND is_active = true
      AND role IN ('school_admin', 'family_admin', 'solo_learner')
  );
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_school_workspace(p_school_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_slug text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_school_name IS NULL OR trim(p_school_name) = '' THEN
    RAISE EXCEPTION 'School name is required';
  END IF;

  v_slug :=
    lower(regexp_replace(trim(p_school_name), '[^a-zA-Z0-9]+', '-', 'g'))
    || '-' || substring(v_uid::text from 1 for 8);

  INSERT INTO public.organizations (type, name, slug)
  VALUES ('school', trim(p_school_name), v_slug)
  RETURNING id INTO v_org_id;

  INSERT INTO public.org_memberships (org_id, profile_id, role)
  VALUES (v_org_id, v_uid, 'school_admin');

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_school_workspace(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_school_workspace(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bootstrap_solo_workspace(
  p_display_name text,
  p_birth_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_student_id uuid;
  v_slug text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_birth_date IS NULL THEN
    RAISE EXCEPTION 'Date of birth is required for solo accounts';
  END IF;
  IF p_birth_date > (CURRENT_DATE - interval '14 years')::date THEN
    RAISE EXCEPTION 'Solo learners must be at least 14 years old';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.org_memberships om
    JOIN public.organizations o ON o.id = om.org_id
    WHERE om.profile_id = v_uid
      AND o.type = 'solo'
      AND om.is_active = true
  ) THEN
    RAISE EXCEPTION 'You already have a solo workspace';
  END IF;

  v_slug := 'solo-' || substring(v_uid::text from 1 for 8);

  INSERT INTO public.organizations (type, name, slug)
  VALUES ('solo', coalesce(nullif(trim(p_display_name), ''), 'My learning space'), v_slug)
  RETURNING id INTO v_org_id;

  INSERT INTO public.org_memberships (org_id, profile_id, role)
  VALUES (v_org_id, v_uid, 'solo_learner');

  INSERT INTO public.students (full_name, display_name, date_of_birth, profile_id)
  VALUES (
    coalesce(nullif(trim(p_display_name), ''), 'Learner'),
    nullif(trim(p_display_name), ''),
    p_birth_date,
    v_uid
  )
  RETURNING id INTO v_student_id;

  INSERT INTO public.student_org_assignments (student_id, org_id)
  VALUES (v_student_id, v_org_id);

  UPDATE public.profiles
  SET birth_date = p_birth_date
  WHERE id = v_uid;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_solo_workspace(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_solo_workspace(text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_student_invitation(
  p_org_id uuid,
  p_student_id uuid,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_id uuid;
  v_norm_email text := lower(trim(p_email));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_norm_email IS NULL OR v_norm_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  SELECT om.role INTO v_role
  FROM public.org_memberships om
  JOIN public.organizations o ON o.id = om.org_id
  WHERE om.profile_id = v_uid
    AND om.org_id = p_org_id
    AND om.is_active = true
    AND o.type IN ('school', 'district')
    AND om.role IN ('school_admin', 'teacher')
  LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Not authorized to invite for this school';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.student_org_assignments
    WHERE student_id = p_student_id AND org_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Student is not a member of this school organization';
  END IF;

  INSERT INTO public.student_invitations (
    org_id, student_id, email, invited_by, status
  ) VALUES (
    p_org_id, p_student_id, v_norm_email, v_uid, 'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_student_invitation(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_student_invitation(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_student_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.student_invitations%rowtype;
  v_user_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_inv
  FROM public.student_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  SELECT lower(trim(email)) INTO v_user_email FROM public.profiles WHERE id = v_uid;
  IF v_user_email IS DISTINCT FROM v_inv.email THEN
    RAISE EXCEPTION 'Signed-in email does not match invitation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.students WHERE id = v_inv.student_id AND profile_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'This student record already has a login linked';
  END IF;

  UPDATE public.students
  SET profile_id = v_uid
  WHERE id = v_inv.student_id;

  UPDATE public.student_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_inv.id;

  RETURN v_inv.student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_student_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_student_invitation(text) TO authenticated;
