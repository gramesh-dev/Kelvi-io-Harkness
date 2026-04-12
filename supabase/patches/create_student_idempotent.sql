-- Apply in Supabase SQL Editor if you already ran an older schema.sql.
-- Replaces create_student() with idempotent + advisory-lock behavior.

CREATE OR REPLACE FUNCTION create_student(
    p_org_id        UUID,
    p_full_name     TEXT,
    p_display_name  TEXT DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_grade_level   TEXT DEFAULT NULL,
    p_relationship  TEXT DEFAULT 'parent'
)
RETURNS UUID AS $$
DECLARE
    v_student_id UUID;
    v_caller UUID := auth.uid();
    v_org_type TEXT;
    v_caller_role TEXT;
    v_is_platform_admin BOOLEAN;
BEGIN
    SELECT type INTO v_org_type
    FROM public.organizations WHERE id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization % does not exist', p_org_id;
    END IF;

    SELECT role INTO v_caller_role
    FROM public.org_memberships
    WHERE profile_id = v_caller
      AND org_id = p_org_id
      AND is_active = true
    ORDER BY
        CASE role
            WHEN 'family_admin' THEN 1
            WHEN 'school_admin' THEN 1
            WHEN 'parent' THEN 2
            WHEN 'teacher' THEN 2
        END
    LIMIT 1;

    SELECT EXISTS (
        SELECT 1 FROM public.platform_roles
        WHERE profile_id = v_caller AND role = 'platform_admin'
    ) INTO v_is_platform_admin;

    IF v_caller_role IS NULL AND NOT v_is_platform_admin THEN
        RAISE EXCEPTION 'Not authorized to create students in this organization';
    END IF;

    PERFORM pg_advisory_xact_lock(
        hashtext(coalesce(v_caller::text, '') || '|' || p_org_id::text || '|' || lower(trim(p_full_name))),
        hashtext(coalesce(p_grade_level, '') || '|' || coalesce(p_date_of_birth::text, ''))
    );

    SELECT s.id INTO v_student_id
    FROM public.students s
    INNER JOIN public.student_org_assignments soa
        ON soa.student_id = s.id AND soa.org_id = p_org_id
    WHERE lower(trim(s.full_name)) = lower(trim(p_full_name))
      AND s.date_of_birth IS NOT DISTINCT FROM p_date_of_birth
      AND coalesce(nullif(trim(s.grade_level), ''), '') = coalesce(nullif(trim(p_grade_level), ''), '')
      AND coalesce(nullif(trim(s.display_name), ''), '') = coalesce(nullif(trim(p_display_name), ''), '')
    LIMIT 1;

    IF v_student_id IS NOT NULL THEN
        RETURN v_student_id;
    END IF;

    INSERT INTO public.students (full_name, display_name, date_of_birth, grade_level)
    VALUES (p_full_name, p_display_name, p_date_of_birth, p_grade_level)
    RETURNING id INTO v_student_id;

    INSERT INTO public.student_org_assignments (student_id, org_id)
    VALUES (v_student_id, p_org_id);

    IF v_org_type = 'family'
       AND (v_caller_role IN ('family_admin', 'parent') OR v_is_platform_admin)
    THEN
        INSERT INTO public.student_guardians (student_id, guardian_id, relationship, is_primary)
        VALUES (v_student_id, v_caller, p_relationship, true);
    END IF;

    RETURN v_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION create_student(UUID, TEXT, TEXT, DATE, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_student(UUID, TEXT, TEXT, DATE, TEXT, TEXT) TO authenticated;
