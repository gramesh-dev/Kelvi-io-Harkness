-- Allow school teachers (not only org admins) to create classrooms and assign
-- themselves as classroom teachers — required for teacher-facing "Add class" in app.

CREATE OR REPLACE FUNCTION public.is_school_staff(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_memberships om
    JOIN public.organizations o ON o.id = om.org_id
    WHERE om.profile_id = auth.uid()
      AND om.org_id = target_org_id
      AND om.is_active = true
      AND o.type = 'school'
      AND om.role IN ('school_admin', 'teacher')
  );
$$;

COMMENT ON FUNCTION public.is_school_staff(uuid) IS
  'True if the current user is an active school_admin or teacher in the given school org.';

REVOKE ALL ON FUNCTION public.is_school_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_school_staff(uuid) TO authenticated;

DROP POLICY IF EXISTS class_insert ON public.classrooms;
CREATE POLICY class_insert ON public.classrooms
  FOR INSERT
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_org_admin(org_id)
    OR public.is_school_staff(org_id)
  );

DROP POLICY IF EXISTS ct_insert ON public.classroom_teachers;
CREATE POLICY ct_insert ON public.classroom_teachers
  FOR INSERT
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_org_admin((SELECT c.org_id FROM public.classrooms c WHERE c.id = classroom_id))
    OR (
      profile_id = auth.uid()
      AND public.is_school_staff((SELECT c.org_id FROM public.classrooms c WHERE c.id = classroom_id))
    )
  );
