-- ============================================================
-- KELVI — ROW LEVEL SECURITY POLICIES
-- AI-first, multi-tenant, child-safe educational platform
-- ============================================================
--
-- Security principles:
--   • Most students have no auth.uid(); linked learners (14+) may equal students.profile_id
--   • org_id on learning_sessions is the tenant boundary
--   • FORCE RLS on child-sensitive and system-critical tables
--   • Service-role only writes for: platform_roles, audit_logs,
--     events, ai_interactions, ai_artifacts, progress_snapshots,
--     ai_usage_daily, student_org_assignments, subscriptions
--   • Student creation via create_student() RPC only
--     - Family flow: auto-links caller as guardian
--     - School flow: NO guardian link (added separately)
--   • End users can only create family-type organizations
--   • Guardian INSERT requires admin access to a shared org
--   • Profile visibility narrowed to specific relationships
--   • All SECURITY DEFINER functions have SET search_path = public
--   • EXECUTE revoked from PUBLIC; granted only to authenticated
--
-- See also: docs/architecture.md, supabase/schema.sql
-- ============================================================


-- ── ENABLE RLS ON ALL TABLES ──────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_org_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_account_invites ENABLE ROW LEVEL SECURITY;


-- ── FORCE RLS ON SENSITIVE TABLES ─────────────────────────
-- Ensures policies apply even to the table owner (postgres role).
-- The supabase service_role key bypasses RLS by design.

ALTER TABLE students FORCE ROW LEVEL SECURITY;
ALTER TABLE student_guardians FORCE ROW LEVEL SECURITY;
ALTER TABLE student_org_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE session_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE parental_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE platform_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;


-- ── HELPER FUNCTIONS ─────────────────────────────────────
-- All SECURITY DEFINER: run as DB owner to avoid recursive RLS
-- when reading membership tables. STABLE for query optimization.

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.platform_roles
        WHERE profile_id = auth.uid()
          AND role = 'platform_admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_org_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.org_memberships
        WHERE profile_id = auth.uid()
          AND org_id = target_org_id
          AND is_active = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_org_admin(target_org_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.org_memberships
        WHERE profile_id = auth.uid()
          AND org_id = target_org_id
          AND role IN ('school_admin', 'family_admin')
          AND is_active = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Teachers and school admins in a school org (used for classroom INSERT, etc.)
CREATE OR REPLACE FUNCTION is_school_staff(target_org_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION is_school_staff(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_school_staff(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION can_access_student(target_student_id UUID)
RETURNS BOOLEAN AS $$
    SELECT
        is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = target_student_id AND s.profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.student_guardians
            WHERE guardian_id = auth.uid()
              AND student_id = target_student_id
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
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_classroom_teacher(target_classroom_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classroom_teachers
        WHERE profile_id = auth.uid()
          AND classroom_id = target_classroom_id
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION can_approve_school_access_as_guardian(p_student_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION can_guardian_view_school_insights(
    p_student_id UUID,
    p_org_id UUID
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;


-- ── HELPER FUNCTION PERMISSIONS ───────────────────────────
-- These SECURITY DEFINER functions run with owner privileges.
-- Revoke default PUBLIC access, grant only to authenticated role
-- (needed for RLS policy evaluation).

REVOKE ALL ON FUNCTION is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION is_org_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_org_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_student(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_classroom_teacher(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_approve_school_access_as_guardian(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_guardian_view_school_insights(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_classroom_teacher(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_approve_school_access_as_guardian(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_guardian_view_school_insights(UUID, UUID) TO authenticated;


-- ============================================================
-- POLICIES
-- ============================================================

-- ── PROFILES ─────────────────────────────────────────────
-- Visibility narrowed to specific relationships:
--   • Own profile
--   • Guardians of students you can access (co-parents)
--   • Teachers in classrooms you also teach in
--   • Admins of orgs you belong to
--   • Platform admins

CREATE POLICY profiles_select ON profiles FOR SELECT USING (
    id = auth.uid()
    OR is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM student_guardians sg
        WHERE sg.guardian_id = profiles.id
          AND can_access_student(sg.student_id)
    )
    OR EXISTS (
        SELECT 1 FROM classroom_teachers ct1
        JOIN classroom_teachers ct2 ON ct1.classroom_id = ct2.classroom_id
        WHERE ct1.profile_id = auth.uid()
          AND ct2.profile_id = profiles.id
    )
    OR EXISTS (
        SELECT 1 FROM org_memberships om_self
        JOIN org_memberships om_target ON om_self.org_id = om_target.org_id
        WHERE om_self.profile_id = auth.uid() AND om_self.is_active = true
          AND om_target.profile_id = profiles.id AND om_target.is_active = true
          AND om_target.role IN ('school_admin', 'family_admin')
    )
);

CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
    id = auth.uid() OR is_platform_admin()
);

-- No INSERT policy — profiles created by handle_new_user() trigger.


-- ── PLATFORM ROLES ───────────────────────────────────────
-- End users can only read their own role. All mutations are
-- service-role only. First admin seeded via migration.

CREATE POLICY pr_select ON platform_roles FOR SELECT USING (
    profile_id = auth.uid() OR is_platform_admin()
);

-- No INSERT/UPDATE/DELETE policies. Service-role only.


-- ── ORGANIZATIONS ────────────────────────────────────────
-- End users can only create family-type orgs (signup flow).
-- School/district creation requires platform admin or service-role.

CREATE POLICY org_select ON organizations FOR SELECT USING (
    is_org_member(id) OR is_platform_admin()
);

CREATE POLICY org_update ON organizations FOR UPDATE USING (
    is_org_admin(id) OR is_platform_admin()
);

CREATE POLICY org_insert ON organizations FOR INSERT WITH CHECK (
    (type = 'family') OR is_platform_admin()
);


-- ── ORG MEMBERSHIPS ──────────────────────────────────────

CREATE POLICY om_select ON org_memberships FOR SELECT USING (
    profile_id = auth.uid()
    OR is_org_member(org_id)
    OR is_platform_admin()
);

CREATE POLICY om_insert ON org_memberships FOR INSERT WITH CHECK (
    is_org_admin(org_id) OR is_platform_admin()
);

CREATE POLICY om_update ON org_memberships FOR UPDATE USING (
    is_org_admin(org_id) OR is_platform_admin()
);


-- ── STUDENTS ─────────────────────────────────────────────
-- No direct INSERT or DELETE. Creation via create_student() RPC.
--
-- Family flow: parent/family_admin creates student →
--   student + org assignment + guardian link (automatic).
-- School flow: school_admin/teacher creates student →
--   student + org assignment only. Guardian added separately
--   by inviting a parent and linking via sg_insert policy.

CREATE POLICY students_select ON students FOR SELECT USING (
    can_access_student(id) OR is_platform_admin()
);

CREATE POLICY students_update ON students FOR UPDATE USING (
    can_access_student(id) OR is_platform_admin()
);

-- No INSERT policy: use create_student() RPC.
-- No DELETE policy: use service-role for deactivation/deletion.


-- ── STUDENT ORG ASSIGNMENTS ──────────────────────────────
-- Managed by create_student() RPC and service-role admin actions.

CREATE POLICY soa_select ON student_org_assignments FOR SELECT USING (
    can_access_student(student_id) OR is_platform_admin()
);

-- No INSERT/UPDATE/DELETE policies. Service-role only.


-- ── STUDENT GUARDIANS ────────────────────────────────────
-- INSERT requires the caller is an admin of an org the student
-- already belongs to. Initial guardian created by create_student() RPC.

CREATE POLICY sg_select ON student_guardians FOR SELECT USING (
    guardian_id = auth.uid()
    OR can_access_student(student_id)
    OR is_platform_admin()
);

CREATE POLICY sg_insert ON student_guardians FOR INSERT WITH CHECK (
    (
        guardian_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM org_memberships om
            JOIN student_org_assignments soa ON om.org_id = soa.org_id
            WHERE om.profile_id = auth.uid()
              AND om.role IN ('school_admin', 'family_admin')
              AND om.is_active = true
              AND soa.student_id = student_guardians.student_id
        )
    )
    OR is_platform_admin()
);


-- ── PARENTAL CONSENTS ────────────────────────────────────
-- Only guardians of the student can grant consent.

CREATE POLICY pc_select ON parental_consents FOR SELECT USING (
    consenting_adult = auth.uid()
    OR can_access_student(student_id)
    OR is_platform_admin()
);

CREATE POLICY pc_insert ON parental_consents FOR INSERT WITH CHECK (
    consenting_adult = auth.uid()
    AND EXISTS (
        SELECT 1 FROM student_guardians
        WHERE guardian_id = auth.uid()
          AND student_id = parental_consents.student_id
    )
);


-- ── CLASSROOMS ───────────────────────────────────────────
-- trg_classroom_school_only trigger (schema.sql) independently
-- enforces that org_id is a school-type organization.

CREATE POLICY class_select ON classrooms FOR SELECT USING (
    is_org_member(org_id)
    OR is_classroom_teacher(id)
    OR is_platform_admin()
);

CREATE POLICY class_insert ON classrooms FOR INSERT WITH CHECK (
    is_platform_admin()
    OR is_org_admin(org_id)
    OR is_school_staff(org_id)
);

CREATE POLICY class_update ON classrooms FOR UPDATE USING (
    is_org_admin(org_id)
    OR is_classroom_teacher(id)
    OR is_platform_admin()
);


-- ── CLASSROOM TEACHERS ───────────────────────────────────

CREATE POLICY ct_select ON classroom_teachers FOR SELECT USING (
    is_org_member((SELECT org_id FROM classrooms WHERE id = classroom_id))
    OR is_classroom_teacher(classroom_id)
    OR is_platform_admin()
);

CREATE POLICY ct_insert ON classroom_teachers FOR INSERT WITH CHECK (
    is_platform_admin()
    OR is_org_admin((SELECT org_id FROM classrooms WHERE id = classroom_id))
    OR (
        profile_id = auth.uid()
        AND is_school_staff((SELECT org_id FROM classrooms WHERE id = classroom_id))
    )
);


-- ── CLASSROOM STUDENTS ───────────────────────────────────

CREATE POLICY cs_select ON classroom_students FOR SELECT USING (
    is_classroom_teacher(classroom_id)
    OR is_org_admin((SELECT org_id FROM classrooms WHERE id = classroom_id))
    OR is_platform_admin()
);

CREATE POLICY cs_insert ON classroom_students FOR INSERT WITH CHECK (
    is_org_admin((SELECT org_id FROM classrooms WHERE id = classroom_id))
    OR is_classroom_teacher(classroom_id)
    OR is_platform_admin()
);


-- ── LEARNING SESSIONS ────────────────────────────────────
-- trg_session_consistency trigger (schema.sql) independently
-- enforces student-org-classroom referential integrity.

CREATE POLICY ls_select ON learning_sessions FOR SELECT USING (
    initiated_by = auth.uid()
    OR can_access_student(student_id)
    OR is_platform_admin()
    OR can_guardian_view_school_insights(student_id, org_id)
);

CREATE POLICY ls_insert ON learning_sessions FOR INSERT WITH CHECK (
    initiated_by = auth.uid()
    AND can_access_student(student_id)
);


-- ── SESSION MESSAGES ─────────────────────────────────────

CREATE POLICY sm_select ON session_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM learning_sessions ls
        WHERE ls.id = session_messages.session_id
          AND (
              ls.initiated_by = auth.uid()
              OR can_access_student(ls.student_id)
              OR can_guardian_view_school_insights(ls.student_id, ls.org_id)
          )
    )
    OR is_platform_admin()
);

CREATE POLICY sm_insert ON session_messages FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM learning_sessions ls
        WHERE ls.id = session_messages.session_id
          AND ls.initiated_by = auth.uid()
    )
);


-- ── AI INTERACTIONS ──────────────────────────────────────
-- Read: org admins + platform admins (cost/usage data, system prompts).
-- Write: service-role only (backend AI gateway).

CREATE POLICY aii_select ON ai_interactions FOR SELECT USING (
    is_org_admin(org_id) OR is_platform_admin()
);

-- No INSERT/UPDATE/DELETE policies. Service-role only.


-- ── AI ARTIFACTS ─────────────────────────────────────────
-- Read: anyone with access to the student, or org admin.
-- Write: service-role only (Edge Functions, AI gateway).

CREATE POLICY artifact_select ON ai_artifacts FOR SELECT USING (
    (
        student_id IS NOT NULL
        AND (
            can_access_student(student_id)
            OR can_guardian_view_school_insights(student_id, org_id)
        )
    )
    OR is_org_admin(org_id)
    OR is_platform_admin()
);

-- No INSERT/UPDATE/DELETE policies. Service-role only.


-- ── ASSIGNMENTS ──────────────────────────────────────────

CREATE POLICY assign_select ON assignments FOR SELECT USING (
    is_classroom_teacher(classroom_id)
    OR EXISTS (
        SELECT 1 FROM classroom_students cs
        WHERE cs.classroom_id = assignments.classroom_id
          AND can_access_student(cs.student_id)
    )
    OR EXISTS (
        SELECT 1 FROM classrooms c
        WHERE c.id = assignments.classroom_id
          AND is_org_admin(c.org_id)
    )
    OR is_platform_admin()
);

CREATE POLICY assign_insert ON assignments FOR INSERT WITH CHECK (
    is_classroom_teacher(classroom_id) OR is_platform_admin()
);


-- ── SUBMISSIONS ──────────────────────────────────────────

CREATE POLICY sub_select ON submissions FOR SELECT USING (
    can_access_student(student_id)
    OR EXISTS (
        SELECT 1 FROM assignments a
        WHERE a.id = submissions.assignment_id
          AND is_classroom_teacher(a.classroom_id)
    )
    OR EXISTS (
        SELECT 1 FROM assignments a2
        JOIN classrooms c ON c.id = a2.classroom_id
        WHERE a2.id = submissions.assignment_id
          AND can_guardian_view_school_insights(submissions.student_id, c.org_id)
    )
    OR is_platform_admin()
);


-- ── PROGRESS SNAPSHOTS ───────────────────────────────────
-- Read: guardians, teachers, org admins.
-- Write: service-role only (nightly aggregation Edge Function).

CREATE POLICY ps_select ON progress_snapshots FOR SELECT USING (
    can_access_student(student_id)
    OR is_org_admin(org_id)
    OR is_platform_admin()
    OR can_guardian_view_school_insights(student_id, org_id)
);

-- No INSERT/UPDATE/DELETE policies. Service-role only.


-- ── AI USAGE DAILY ───────────────────────────────────────
-- Read: org admins + platform admins.
-- Write: service-role only (aggregation Edge Function).

CREATE POLICY aud_select ON ai_usage_daily FOR SELECT USING (
    is_org_admin(org_id) OR is_platform_admin()
);

-- No INSERT/UPDATE/DELETE policies. Service-role only.


-- ── AUDIT LOGS ───────────────────────────────────────────
-- No end-user INSERT — prevents log spoofing / evidence planting.
-- All audit writes go through service-role (backend server actions).
-- Read: org admins see their org's logs, platform admins see all.

CREATE POLICY audit_select ON audit_logs FOR SELECT USING (
    is_platform_admin()
    OR (org_id IS NOT NULL AND is_org_admin(org_id))
);

-- No INSERT/UPDATE/DELETE policies. Service-role only.


-- ── EVENTS ───────────────────────────────────────────────
-- No end-user INSERT — prevents analytics poisoning.
-- All event writes go through service-role (backend server actions).
-- Read: org admins + platform admins.

CREATE POLICY events_select ON events FOR SELECT USING (
    is_platform_admin()
    OR (org_id IS NOT NULL AND is_org_admin(org_id))
);

-- No INSERT/UPDATE/DELETE policies. Service-role only.


-- ── INVITATIONS ──────────────────────────────────────────

CREATE POLICY inv_select ON invitations FOR SELECT USING (
    is_org_admin(org_id) OR is_platform_admin()
);

CREATE POLICY inv_insert ON invitations FOR INSERT WITH CHECK (
    is_org_admin(org_id) OR is_platform_admin()
);


-- ── SCHOOL ACCESS REQUESTS / LEARNER ACCOUNT INVITES ─────
-- Staff invitations stay on invitations; these are learner/school linking.
-- Mutations are RPC-first; SELECT allows relevant parties to list rows.

CREATE POLICY sar_select ON school_access_requests FOR SELECT USING (
    requested_by_profile_id = auth.uid()
    OR recipient_guardian_profile_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM org_memberships om
        WHERE om.org_id = school_access_requests.school_org_id
          AND om.profile_id = auth.uid()
          AND om.is_active = true
          AND om.role IN ('school_admin', 'teacher')
    )
    OR can_approve_school_access_as_guardian(student_id)
    OR is_platform_admin()
);

CREATE POLICY lai_select ON learner_account_invites FOR SELECT USING (
    inviting_guardian_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM student_guardians sg
        WHERE sg.student_id = learner_account_invites.student_id
          AND sg.guardian_id = auth.uid()
    )
    OR is_platform_admin()
);


-- ── SUBSCRIPTIONS ────────────────────────────────────────
-- Read: org admins.
-- Write: service-role only (Stripe webhooks).

CREATE POLICY subs_select ON subscriptions FOR SELECT USING (
    is_org_admin(org_id) OR is_platform_admin()
);

-- No INSERT/UPDATE/DELETE policies. Service-role only.

-- ── CLASSROOM ROSTER INVITES (invite-only enrollment) ─────────────────
-- Full DDL + RPCs: migration `20260422100000_classroom_roster_invites_only.sql`.

ALTER TABLE IF EXISTS public.classroom_roster_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cri_select ON public.classroom_roster_invites;
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

DROP POLICY IF EXISTS cri_insert ON public.classroom_roster_invites;
CREATE POLICY cri_insert ON public.classroom_roster_invites FOR INSERT WITH CHECK (
    public.is_platform_admin()
    OR invited_by = auth.uid()
);

DROP POLICY IF EXISTS cri_update ON public.classroom_roster_invites;
CREATE POLICY cri_update ON public.classroom_roster_invites FOR UPDATE USING (
    public.is_platform_admin()
    OR invited_by = auth.uid()
    OR public.is_org_admin(org_id)
);

-- ── CLOSED BETA INVITES (temporary invite-only gate) ──────────────────────

ALTER TABLE IF EXISTS public.beta_access_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS beta_access_invites_select ON public.beta_access_invites;
CREATE POLICY beta_access_invites_select ON public.beta_access_invites FOR SELECT USING (
    public.is_platform_admin()
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

DROP POLICY IF EXISTS beta_access_invites_insert ON public.beta_access_invites;
CREATE POLICY beta_access_invites_insert ON public.beta_access_invites FOR INSERT WITH CHECK (
    public.is_platform_admin()
);

DROP POLICY IF EXISTS beta_access_invites_update ON public.beta_access_invites;
CREATE POLICY beta_access_invites_update ON public.beta_access_invites FOR UPDATE USING (
    public.is_platform_admin()
) WITH CHECK (
    public.is_platform_admin()
);

DROP POLICY IF EXISTS beta_access_invites_delete ON public.beta_access_invites;
CREATE POLICY beta_access_invites_delete ON public.beta_access_invites FOR DELETE USING (
    public.is_platform_admin()
);
