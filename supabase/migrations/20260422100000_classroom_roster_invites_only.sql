-- Invite-only class roster: parents accept by email; no direct teacher insert into classroom_students.

CREATE TABLE IF NOT EXISTS public.classroom_roster_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_email text NOT NULL,
  child_full_name text NOT NULL,
  child_display_name text,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cri_classroom ON public.classroom_roster_invites (classroom_id);
CREATE INDEX IF NOT EXISTS idx_cri_token ON public.classroom_roster_invites (token);
CREATE INDEX IF NOT EXISTS idx_cri_email ON public.classroom_roster_invites (lower(parent_email));

ALTER TABLE public.classroom_roster_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY cri_select ON public.classroom_roster_invites FOR SELECT USING (
  public.is_platform_admin()
  OR invited_by = auth.uid()
  OR public.is_org_admin(org_id)
  OR EXISTS (
    SELECT 1 FROM public.classroom_teachers ct
    WHERE ct.classroom_id = classroom_roster_invites.classroom_id
      AND ct.profile_id = auth.uid()
  )
);

CREATE POLICY cri_insert ON public.classroom_roster_invites FOR INSERT WITH CHECK (
  public.is_platform_admin()
  OR invited_by = auth.uid()
);

CREATE POLICY cri_update ON public.classroom_roster_invites FOR UPDATE USING (
  public.is_platform_admin()
  OR invited_by = auth.uid()
  OR public.is_org_admin(org_id)
);

COMMENT ON TABLE public.classroom_roster_invites IS
  'Parent-email invites to enroll a child in a class. Student row is created on accept only.';

-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_classroom_roster_invite(
  p_classroom_id uuid,
  p_parent_email text,
  p_child_full_name text,
  p_child_display_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_id uuid;
  v_email text := lower(trim(p_parent_email));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Parent email is required';
  END IF;
  IF p_child_full_name IS NULL OR trim(p_child_full_name) = '' THEN
    RAISE EXCEPTION 'Student name is required';
  END IF;

  SELECT c.org_id INTO v_org_id
  FROM public.classrooms c
  WHERE c.id = p_classroom_id AND c.is_active = true;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classroom_teachers
    WHERE classroom_id = p_classroom_id AND profile_id = v_uid
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.org_memberships
    WHERE org_id = v_org_id AND profile_id = v_uid AND is_active = true
      AND role = 'school_admin'
  )
  AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized to invite for this class';
  END IF;

  INSERT INTO public.classroom_roster_invites (
    classroom_id, org_id, parent_email, child_full_name, child_display_name, invited_by
  ) VALUES (
    p_classroom_id,
    v_org_id,
    v_email,
    trim(p_child_full_name),
    nullif(trim(p_child_display_name), ''),
    v_uid
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_classroom_roster_invite(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_classroom_roster_invite(uuid, text, text, text) TO authenticated;

-- Accept: parent must be logged in; email must match invite. Creates student + SOA + roster + guardian.
CREATE OR REPLACE FUNCTION public.accept_classroom_roster_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.classroom_roster_invites%rowtype;
  v_email text;
  v_student_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  SELECT * INTO v_inv
  FROM public.classroom_roster_invites
  WHERE token = trim(p_token)
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  SELECT lower(trim(email)) INTO v_email FROM public.profiles WHERE id = v_uid;
  IF v_email IS DISTINCT FROM v_inv.parent_email THEN
    RAISE EXCEPTION 'Sign in with the email this invitation was sent to';
  END IF;

  INSERT INTO public.students (full_name, display_name, grade_level)
  VALUES (
    v_inv.child_full_name,
    v_inv.child_display_name,
    NULL
  )
  RETURNING id INTO v_student_id;

  INSERT INTO public.student_org_assignments (student_id, org_id)
  VALUES (v_student_id, v_inv.org_id);

  INSERT INTO public.classroom_students (classroom_id, student_id)
  VALUES (v_inv.classroom_id, v_student_id);

  INSERT INTO public.student_guardians (student_id, guardian_id, relationship, is_primary)
  VALUES (v_student_id, v_uid, 'parent', true);

  UPDATE public.classroom_roster_invites
  SET status = 'accepted',
      accepted_at = now(),
      accepted_student_id = v_student_id
  WHERE id = v_inv.id;

  RETURN v_student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_classroom_roster_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_classroom_roster_invite(text) TO authenticated;

-- Note: Invite-only is enforced in the app (no direct-add action). classroom_students RLS
-- unchanged so existing policies still apply; optional later: restrict cs_insert once all
-- enroll paths use accept_* or service role.
