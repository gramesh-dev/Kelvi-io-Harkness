-- Removes rows that reference profiles.id without ON DELETE CASCADE so the auth
-- user can be deleted via service role. Run delete_own_account_data() then auth.admin.deleteUser.

CREATE OR REPLACE FUNCTION public.delete_own_account_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Sessions this user started (FK learning_sessions.initiated_by → profiles)
  DELETE FROM public.learning_sessions WHERE initiated_by = uid;

  -- Solo-learner student row (students.profile_id = this user)
  DELETE FROM public.learning_sessions
  WHERE student_id IN (SELECT id FROM public.students WHERE profile_id = uid);

  DELETE FROM public.submissions
  WHERE student_id IN (SELECT id FROM public.students WHERE profile_id = uid);

  DELETE FROM public.progress_snapshots
  WHERE student_id IN (SELECT id FROM public.students WHERE profile_id = uid);

  DELETE FROM public.ai_artifacts
  WHERE student_id IN (SELECT id FROM public.students WHERE profile_id = uid);

  DELETE FROM public.ai_interactions
  WHERE student_id IN (SELECT id FROM public.students WHERE profile_id = uid);

  DELETE FROM public.students WHERE profile_id = uid;

  DELETE FROM public.parental_consents WHERE consenting_adult = uid;

  DELETE FROM public.assignments WHERE created_by = uid;

  DELETE FROM public.invitations WHERE invited_by = uid;

  DELETE FROM public.audit_logs WHERE actor_id = uid;

  DELETE FROM public.events WHERE actor_id = uid;

  UPDATE public.platform_roles SET granted_by = NULL WHERE granted_by = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account_data() TO authenticated;

COMMENT ON FUNCTION public.delete_own_account_data IS
  'Clears user-owned rows that block profile deletion; call before auth.admin.deleteUser.';
