-- M1–M7: Family-first learner model — school access requests, learner account invites,
-- guardian school insights flag, one-login↔one-learner invariant, RLS helpers.
-- Guardian approval: ANY guardian OR family_admin in the learner's family org may approve.
-- notify_parent_* is notification intent only; parent_school_insights_visible is permission only.
-- Learner invite acceptance compares email to auth.users (source of truth), not profiles.email.
-- Solo remains out of scope here (no solo DDL in this file).

-- ── M1: student_org_assignments.parent_school_insights_visible ───────────
ALTER TABLE public.student_org_assignments
  ADD COLUMN IF NOT EXISTS parent_school_insights_visible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.student_org_assignments.parent_school_insights_visible IS
  'When true, guardians may SELECT school-context progress for this learner for this school org link. Independent from notification flags.';

CREATE UNIQUE INDEX IF NOT EXISTS students_one_profile_id
  ON public.students (profile_id)
  WHERE profile_id IS NOT NULL;

COMMENT ON COLUMN public.students.date_of_birth IS
  'Canonical learner DOB for age rules (e.g. 14+ login); under-14 learners may have no auth profile.';

-- ── M2: school_access_requests (separate from staff invitations) ────────
CREATE TABLE IF NOT EXISTS public.school_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  school_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,

  requested_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  recipient_kind text NOT NULL
    CHECK (recipient_kind IN ('guardian', 'learner')),

  -- Optional routing hint for notifications only; NOT required for approval authority.
  recipient_guardian_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Product: “tell parent when learner acts” — does NOT grant visibility.
  notify_parent boolean NOT NULL DEFAULT false,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'cancelled', 'expired')),

  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),

  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS sar_school_status
  ON public.school_access_requests (school_org_id, status);
CREATE INDEX IF NOT EXISTS sar_student_status
  ON public.school_access_requests (student_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS sar_one_pending_per_school_student
  ON public.school_access_requests (school_org_id, student_id)
  WHERE (status = 'pending');

ALTER TABLE public.school_access_requests ENABLE ROW LEVEL SECURITY;

-- ── M3: learner_account_invites (separate from invitations + school_access)
CREATE TABLE IF NOT EXISTS public.learner_account_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  inviting_guardian_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),

  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS lai_token ON public.learner_account_invites (token);
CREATE INDEX IF NOT EXISTS lai_student ON public.learner_account_invites (student_id);

ALTER TABLE public.learner_account_invites ENABLE ROW LEVEL SECURITY;

-- ── Helpers: who may approve school access as “guardian path” ─────────────
CREATE OR REPLACE FUNCTION public.can_approve_school_access_as_guardian(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = p_student_id
        AND sg.guardian_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.student_org_assignments soa
      JOIN public.organizations o ON o.id = soa.org_id AND o.type = 'family'
      JOIN public.org_memberships om
        ON om.org_id = soa.org_id
       AND om.profile_id = auth.uid()
       AND om.is_active = true
       AND om.role = 'family_admin'
      WHERE soa.student_id = p_student_id
    );
$$;

REVOKE ALL ON FUNCTION public.can_approve_school_access_as_guardian(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_approve_school_access_as_guardian(uuid) TO authenticated;

-- Guardian may read school-context rows when flag is set (v1 single rule).
CREATE OR REPLACE FUNCTION public.can_guardian_view_school_insights(
  p_student_id uuid,
  p_org_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_org_assignments soa
    JOIN public.organizations o ON o.id = soa.org_id
    WHERE soa.student_id = p_student_id
      AND soa.org_id = p_org_id
      AND soa.parent_school_insights_visible = true
      AND o.type IN ('school', 'district')
  )
  AND EXISTS (
    SELECT 1 FROM public.student_guardians sg
    WHERE sg.student_id = p_student_id
      AND sg.guardian_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.can_guardian_view_school_insights(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_guardian_view_school_insights(uuid, uuid) TO authenticated;

-- ── protect students.profile_id except via controlled session setting ────
CREATE OR REPLACE FUNCTION public.trg_students_guard_profile_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.profile_id IS DISTINCT FROM NEW.profile_id THEN
    IF current_setting('kelvi.allow_profile_link', true) <> '1' THEN
      RAISE EXCEPTION 'profile_id may only be changed via accept_learner_account_invite';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_students_guard_profile_id ON public.students;
CREATE TRIGGER trg_students_guard_profile_id
  BEFORE UPDATE OF profile_id ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_students_guard_profile_id();

-- ── RPC: create_school_access_request ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_school_access_request(
  p_school_org_id uuid,
  p_student_id uuid,
  p_notify_parent boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_org_type text;
  v_recipient text;
  v_guardian_hint uuid;
  v_has_profile boolean;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT type INTO v_org_type FROM public.organizations WHERE id = p_school_org_id;
  IF v_org_type IS NULL OR v_org_type NOT IN ('school', 'district') THEN
    RAISE EXCEPTION 'Invalid school organization';
  END IF;

  SELECT om.role INTO v_role
  FROM public.org_memberships om
  WHERE om.profile_id = v_uid
    AND om.org_id = p_school_org_id
    AND om.is_active = true
    AND om.role IN ('school_admin', 'teacher')
  LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Not authorized to request access for this school';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.student_org_assignments
    WHERE student_id = p_student_id AND org_id = p_school_org_id
  ) THEN
    RAISE EXCEPTION 'Learner is already linked to this school organization';
  END IF;

  SELECT (s.profile_id IS NOT NULL) INTO v_has_profile
  FROM public.students s WHERE s.id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Learner not found';
  END IF;

  IF v_has_profile THEN
    v_recipient := 'learner';
  ELSE
    v_recipient := 'guardian';
  END IF;

  SELECT sg.guardian_id INTO v_guardian_hint
  FROM public.student_guardians sg
  WHERE sg.student_id = p_student_id
  ORDER BY sg.is_primary DESC, sg.created_at ASC
  LIMIT 1;

  INSERT INTO public.school_access_requests (
    school_org_id,
    student_id,
    requested_by_profile_id,
    recipient_kind,
    recipient_guardian_profile_id,
    notify_parent,
    status
  ) VALUES (
    p_school_org_id,
    p_student_id,
    v_uid,
    v_recipient,
    v_guardian_hint,
    CASE WHEN v_recipient = 'learner' THEN p_notify_parent ELSE false END,
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_school_access_request(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_school_access_request(uuid, uuid, boolean) TO authenticated;

-- ── RPC: approve_school_access_request ────────────────────────────────────
-- p_grant_parent_school_insights: explicit permission for guardians to read school insights.
-- v1 defaults: guardian recipient -> true unless false; learner recipient -> false unless true.
CREATE OR REPLACE FUNCTION public.approve_school_access_request(
  p_request_id uuid,
  p_grant_parent_school_insights boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.school_access_requests%rowtype;
  v_grant boolean;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO r
  FROM public.school_access_requests
  WHERE id = p_request_id
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Request not found or not pending';
  END IF;

  IF r.recipient_kind = 'guardian' THEN
    IF NOT public.can_approve_school_access_as_guardian(r.student_id) THEN
      RAISE EXCEPTION 'Not authorized to approve for this learner';
    END IF;
    v_grant := coalesce(p_grant_parent_school_insights, true);
  ELSIF r.recipient_kind = 'learner' THEN
    IF (SELECT profile_id FROM public.students WHERE id = r.student_id) IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Not authorized: learner must be signed in as the linked profile';
    END IF;
    v_grant := coalesce(p_grant_parent_school_insights, false);
  ELSE
    RAISE EXCEPTION 'Invalid recipient_kind';
  END IF;

  INSERT INTO public.student_org_assignments (
    student_id,
    org_id,
    parent_school_insights_visible
  ) VALUES (
    r.student_id,
    r.school_org_id,
    v_grant
  );

  UPDATE public.school_access_requests
  SET status = 'approved',
      resolved_at = now(),
      resolved_by_profile_id = v_uid
  WHERE id = r.id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_school_access_request(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_school_access_request(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.deny_school_access_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.school_access_requests%rowtype;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO r
  FROM public.school_access_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Request not found or not pending';
  END IF;

  IF r.recipient_kind = 'guardian' THEN
    IF NOT public.can_approve_school_access_as_guardian(r.student_id) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  ELSIF r.recipient_kind = 'learner' THEN
    IF (SELECT profile_id FROM public.students WHERE id = r.student_id) IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  END IF;

  UPDATE public.school_access_requests
  SET status = 'denied', resolved_at = now(), resolved_by_profile_id = v_uid
  WHERE id = r.id;
END;
$$;

REVOKE ALL ON FUNCTION public.deny_school_access_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deny_school_access_request(uuid) TO authenticated;

-- ── RPC: learner account invite + accept (auth.users email) ──────────────
CREATE OR REPLACE FUNCTION public.create_learner_account_invite(
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
  v_norm text := lower(trim(p_email));
  v_dob date;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_norm IS NULL OR v_norm = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.student_guardians
    WHERE student_id = p_student_id AND guardian_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Only a guardian may create a learner account invite';
  END IF;

  SELECT date_of_birth INTO v_dob FROM public.students WHERE id = p_student_id;
  IF v_dob IS NULL OR v_dob > (CURRENT_DATE - interval '14 years')::date THEN
    RAISE EXCEPTION 'Learner must be at least 14 with a stored date_of_birth';
  END IF;

  IF EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id AND profile_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Learner already has a linked login';
  END IF;

  INSERT INTO public.learner_account_invites (
    student_id, inviting_guardian_id, email, status
  ) VALUES (
    p_student_id, v_uid, v_norm, 'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_learner_account_invite(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_learner_account_invite(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_learner_account_invite(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  inv public.learner_account_invites%rowtype;
  v_auth_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_auth_email FROM auth.users WHERE id = v_uid;
  v_auth_email := lower(trim(v_auth_email));
  IF v_auth_email IS NULL OR v_auth_email = '' THEN
    RAISE EXCEPTION 'Account has no email';
  END IF;

  SELECT * INTO inv
  FROM public.learner_account_invites
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  IF v_auth_email <> lower(trim(inv.email)) THEN
    RAISE EXCEPTION 'Signed-in account email does not match invite';
  END IF;

  PERFORM set_config('kelvi.allow_profile_link', '1', true); -- transaction-local

  UPDATE public.students
  SET profile_id = v_uid
  WHERE id = inv.student_id
    AND profile_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unable to link profile (learner may already be linked)';
  END IF;

  UPDATE public.learner_account_invites
  SET status = 'accepted', accepted_at = now()
  WHERE id = inv.id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_learner_account_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_learner_account_invite(text) TO authenticated;

-- ── can_access_student: include self-linked learner row ─────────────────
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

GRANT EXECUTE ON FUNCTION public.can_access_student(uuid) TO authenticated;

-- ── M7: RLS — guardian school insights (read paths) ───────────────────────
DROP POLICY IF EXISTS ls_select ON public.learning_sessions;
CREATE POLICY ls_select ON public.learning_sessions FOR SELECT USING (
  initiated_by = auth.uid()
  OR public.can_access_student(student_id)
  OR public.is_platform_admin()
  OR public.can_guardian_view_school_insights(student_id, org_id)
);

DROP POLICY IF EXISTS ps_select ON public.progress_snapshots;
CREATE POLICY ps_select ON public.progress_snapshots FOR SELECT USING (
  public.can_access_student(student_id)
  OR public.is_org_admin(org_id)
  OR public.is_platform_admin()
  OR public.can_guardian_view_school_insights(student_id, org_id)
);

DROP POLICY IF EXISTS artifact_select ON public.ai_artifacts;
CREATE POLICY artifact_select ON public.ai_artifacts FOR SELECT USING (
  (
    student_id IS NOT NULL
    AND (
      public.can_access_student(student_id)
      OR public.can_guardian_view_school_insights(student_id, org_id)
    )
  )
  OR public.is_org_admin(org_id)
  OR public.is_platform_admin()
);

DROP POLICY IF EXISTS sub_select ON public.submissions;
CREATE POLICY sub_select ON public.submissions FOR SELECT USING (
  public.can_access_student(student_id)
  OR EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = submissions.assignment_id
      AND public.is_classroom_teacher(a.classroom_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.assignments a2
    JOIN public.classrooms c ON c.id = a2.classroom_id
    WHERE a2.id = submissions.assignment_id
      AND public.can_guardian_view_school_insights(submissions.student_id, c.org_id)
  )
  OR public.is_platform_admin()
);

-- Session messages follow session visibility (guardian insights path).
DROP POLICY IF EXISTS sm_select ON public.session_messages;
CREATE POLICY sm_select ON public.session_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.learning_sessions ls
    WHERE ls.id = session_messages.session_id
      AND (
        ls.initiated_by = auth.uid()
        OR public.can_access_student(ls.student_id)
        OR public.can_guardian_view_school_insights(ls.student_id, ls.org_id)
      )
  )
  OR public.is_platform_admin()
);

-- Direct table reads are optional (RPCs are authoritative); these allow listing in UI.
DROP POLICY IF EXISTS sar_select ON public.school_access_requests;
CREATE POLICY sar_select ON public.school_access_requests FOR SELECT USING (
  requested_by_profile_id = auth.uid()
  OR recipient_guardian_profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.org_memberships om
    WHERE om.org_id = school_org_id
      AND om.profile_id = auth.uid()
      AND om.is_active = true
      AND om.role IN ('school_admin', 'teacher')
  )
  OR public.can_approve_school_access_as_guardian(student_id)
  OR public.is_platform_admin()
);

DROP POLICY IF EXISTS lai_select ON public.learner_account_invites;
CREATE POLICY lai_select ON public.learner_account_invites FOR SELECT USING (
  inviting_guardian_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.student_guardians sg
    WHERE sg.student_id = learner_account_invites.student_id
      AND sg.guardian_id = auth.uid()
  )
  OR public.is_platform_admin()
);
