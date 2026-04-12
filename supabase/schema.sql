-- ============================================================
-- KELVI — PRODUCTION DATABASE SCHEMA
-- AI-first, multi-tenant, child-safe educational platform
-- ============================================================
--
-- Stack:  Supabase PostgreSQL · Supabase Auth · Next.js
--
-- Security model summary:
--   • Students created exclusively via create_student() RPC — no direct INSERT
--     - Family flow: auto-links caller as guardian
--     - School flow: NO guardian link (added separately)
--   • Classrooms enforced to school-type orgs via trigger
--   • Learning sessions enforce student-org-classroom consistency via trigger
--   • Profile auto-created on auth.users signup via trigger
--   • All SECURITY DEFINER functions have SET search_path = public
--   • EXECUTE revoked from PUBLIC on all functions; granted to
--     authenticated only where needed (helpers + create_student RPC)
--   • RLS policies defined separately in rls.sql
--
-- See also: docs/architecture.md, supabase/rls.sql
-- ============================================================

-- ── EXTENSIONS ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── HELPER: auto-update updated_at ───────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- IDENTITY LAYER
-- ============================================================

CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    full_name   TEXT NOT NULL,
    avatar_url  TEXT,
    timezone    TEXT DEFAULT 'UTC',
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Platform-wide roles (platform_admin, platform_support).
-- Completely separate from org-scoped roles in org_memberships.
-- Mutations are service-role only — no end-user write policies.
CREATE TABLE platform_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('platform_admin', 'platform_support')),
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by  UUID REFERENCES profiles(id),
    UNIQUE(profile_id, role)
);

-- ============================================================
-- ORGANIZATION LAYER
-- ============================================================

-- Unified org table with type discriminator.
-- district → school hierarchy via parent_id.
-- End users can only create type='family' (see rls.sql).
CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        TEXT NOT NULL CHECK (type IN ('school', 'family', 'district')),
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE,
    parent_id   UUID REFERENCES organizations(id),
    settings    JSONB DEFAULT '{}',
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_type ON organizations(type);
CREATE INDEX idx_org_parent ON organizations(parent_id) WHERE parent_id IS NOT NULL;

CREATE TRIGGER trg_org_updated BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE org_memberships (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN (
                    'parent', 'family_admin',
                    'teacher', 'school_admin'
                )),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, profile_id, role)
);

CREATE INDEX idx_om_profile ON org_memberships(profile_id);
CREATE INDEX idx_om_org ON org_memberships(org_id);
CREATE INDEX idx_om_org_role ON org_memberships(org_id, role);

-- ============================================================
-- STUDENT LAYER
-- ============================================================

-- Students are NOT auth.users. Young children (5-8) cannot have accounts.
-- Optional profile_id links older students who get a login later.
-- No direct INSERT policy — creation via create_student() RPC only.
CREATE TABLE students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
    full_name       TEXT NOT NULL,
    display_name    TEXT,
    date_of_birth   DATE,
    grade_level     TEXT,
    avatar_url      TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_profile ON students(profile_id) WHERE profile_id IS NOT NULL;

CREATE TRIGGER trg_student_updated BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Which orgs a student belongs to. Managed by create_student() RPC
-- and service-role admin actions — no end-user write policies.
CREATE TABLE student_org_assignments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id, org_id)
);

CREATE INDEX idx_soa_student ON student_org_assignments(student_id);
CREATE INDEX idx_soa_org ON student_org_assignments(org_id);

-- Guardian links. INSERT requires caller is admin of a shared org
-- (see rls.sql). Initial guardian created by create_student() RPC.
CREATE TABLE student_guardians (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    relationship    TEXT NOT NULL DEFAULT 'parent',
    is_primary      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id, guardian_id)
);

CREATE INDEX idx_sg_student ON student_guardians(student_id);
CREATE INDEX idx_sg_guardian ON student_guardians(guardian_id);

-- COPPA/FERPA consent records. Per consent type, revocable.
-- INSERT requires caller is a guardian of the student.
CREATE TABLE parental_consents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    consenting_adult UUID NOT NULL REFERENCES profiles(id),
    consent_type    TEXT NOT NULL CHECK (consent_type IN (
                        'account_creation', 'ai_interaction', 'data_collection', 'photo_upload'
                    )),
    granted         BOOLEAN NOT NULL,
    granted_at      TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    ip_address      INET,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pc_student ON parental_consents(student_id);

-- ============================================================
-- CLASSROOM LAYER
-- ============================================================

CREATE TABLE classrooms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    grade_level     TEXT,
    subject         TEXT,
    academic_year   TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_class_org ON classrooms(org_id);

CREATE TRIGGER trg_class_updated BEFORE UPDATE ON classrooms
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Classrooms can only belong to school-type organizations.
-- A CHECK constraint cannot cross-reference another table, so this
-- trigger rejects INSERT or UPDATE if the org is not type='school'.
CREATE OR REPLACE FUNCTION enforce_classroom_school_org()
RETURNS TRIGGER AS $$
DECLARE
    org_type TEXT;
BEGIN
    SELECT type INTO org_type FROM organizations WHERE id = NEW.org_id;
    IF org_type IS NULL THEN
        RAISE EXCEPTION 'Organization % does not exist', NEW.org_id;
    END IF;
    IF org_type != 'school' THEN
        RAISE EXCEPTION 'Classrooms can only belong to school-type organizations (got %)', org_type;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_classroom_school_only
    BEFORE INSERT OR UPDATE OF org_id ON classrooms
    FOR EACH ROW EXECUTE FUNCTION enforce_classroom_school_org();

CREATE TABLE classroom_teachers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(classroom_id, profile_id)
);

CREATE INDEX idx_ct_classroom ON classroom_teachers(classroom_id);
CREATE INDEX idx_ct_profile ON classroom_teachers(profile_id);

CREATE TABLE classroom_students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(classroom_id, student_id)
);

CREATE INDEX idx_cs_classroom ON classroom_students(classroom_id);
CREATE INDEX idx_cs_student ON classroom_students(student_id);

-- ============================================================
-- AI / LEARNING SESSION LAYER
-- ============================================================

CREATE TABLE learning_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL REFERENCES students(id),
    org_id              UUID NOT NULL REFERENCES organizations(id),
    classroom_id        UUID REFERENCES classrooms(id),
    initiated_by        UUID NOT NULL REFERENCES profiles(id),
    mode                TEXT NOT NULL CHECK (mode IN ('questioning', 'guided', 'exploration')),
    topic               TEXT,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at            TIMESTAMPTZ,
    summary_artifact_id UUID,
    message_count       INTEGER NOT NULL DEFAULT 0,
    metadata            JSONB DEFAULT '{}'
);

CREATE INDEX idx_ls_student ON learning_sessions(student_id);
CREATE INDEX idx_ls_org ON learning_sessions(org_id);
CREATE INDEX idx_ls_classroom ON learning_sessions(classroom_id) WHERE classroom_id IS NOT NULL;
CREATE INDEX idx_ls_started ON learning_sessions(started_at);

-- Enforces referential consistency across tenant boundaries:
--   1. student_id must belong to org_id (via student_org_assignments)
--   2. classroom_id (if set) must belong to the same org_id
-- Without this, a caller could link an unrelated student, org,
-- and classroom — violating tenant isolation.
CREATE OR REPLACE FUNCTION enforce_session_consistency()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM student_org_assignments
        WHERE student_id = NEW.student_id AND org_id = NEW.org_id
    ) THEN
        RAISE EXCEPTION 'Student % is not assigned to organization %', NEW.student_id, NEW.org_id;
    END IF;

    IF NEW.classroom_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM classrooms
            WHERE id = NEW.classroom_id AND org_id = NEW.org_id
        ) THEN
            RAISE EXCEPTION 'Classroom % does not belong to organization %', NEW.classroom_id, NEW.org_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_session_consistency
    BEFORE INSERT OR UPDATE OF student_id, org_id, classroom_id ON learning_sessions
    FOR EACH ROW EXECUTE FUNCTION enforce_session_consistency();

CREATE TABLE session_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
    ordinal         INTEGER NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    question_type   TEXT CHECK (question_type IN ('P', 'C', 'G')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sm_session ON session_messages(session_id, ordinal);
CREATE INDEX idx_sm_created ON session_messages(created_at);

-- Every AI API call recorded. provider + model columns enable
-- provider abstraction. cost_micros enables budget enforcement.
-- Writes are service-role only (backend AI gateway).
CREATE TABLE ai_interactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID REFERENCES learning_sessions(id) ON DELETE SET NULL,
    message_id      UUID REFERENCES session_messages(id) ON DELETE SET NULL,
    org_id          UUID NOT NULL REFERENCES organizations(id),
    student_id      UUID REFERENCES students(id),
    interaction_type TEXT NOT NULL CHECK (interaction_type IN (
                        'chat', 'summary', 'insight', 'quest_generation',
                        'moderation', 'explanation'
                    )),
    provider        TEXT NOT NULL,
    model           TEXT NOT NULL,
    system_prompt   TEXT,
    input_tokens    INTEGER NOT NULL DEFAULT 0,
    output_tokens   INTEGER NOT NULL DEFAULT 0,
    cost_micros     BIGINT NOT NULL DEFAULT 0,
    latency_ms      INTEGER,
    moderation_flags JSONB DEFAULT '[]',
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_session ON ai_interactions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_ai_org ON ai_interactions(org_id);
CREATE INDEX idx_ai_created ON ai_interactions(created_at);
CREATE INDEX idx_ai_type ON ai_interactions(interaction_type);

-- Generated content: summaries, insights, quests, explanations.
-- Writes are service-role only (Edge Functions, AI gateway).
CREATE TABLE ai_artifacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interaction_id  UUID REFERENCES ai_interactions(id) ON DELETE SET NULL,
    org_id          UUID NOT NULL REFERENCES organizations(id),
    student_id      UUID REFERENCES students(id),
    artifact_type   TEXT NOT NULL CHECK (artifact_type IN (
                        'session_summary', 'progress_insight', 'quest',
                        'explanation', 'hint', 'report'
                    )),
    content         JSONB NOT NULL,
    is_visible      BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_artifact_org ON ai_artifacts(org_id);
CREATE INDEX idx_artifact_student ON ai_artifacts(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_artifact_type ON ai_artifacts(artifact_type);

-- ============================================================
-- ACADEMIC LAYER
-- ============================================================

CREATE TABLE assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES profiles(id),
    title           TEXT NOT NULL,
    description     TEXT,
    quest_artifact_id UUID REFERENCES ai_artifacts(id),
    due_date        TIMESTAMPTZ,
    is_published    BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assign_classroom ON assignments(classroom_id);

CREATE TRIGGER trg_assign_updated BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id),
    content         JSONB,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    score           NUMERIC,
    feedback        TEXT,
    feedback_artifact_id UUID REFERENCES ai_artifacts(id),
    UNIQUE(assignment_id, student_id)
);

CREATE INDEX idx_sub_assignment ON submissions(assignment_id);
CREATE INDEX idx_sub_student ON submissions(student_id);

-- ============================================================
-- ANALYTICS LAYER
-- ============================================================

-- Aggregated per-student progress. Written by nightly Edge Function.
-- Service-role only writes.
CREATE TABLE progress_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    snapshot_date   DATE NOT NULL,
    period          TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
    sessions_count  INTEGER NOT NULL DEFAULT 0,
    messages_count  INTEGER NOT NULL DEFAULT 0,
    time_spent_secs INTEGER NOT NULL DEFAULT 0,
    procedural_q    INTEGER NOT NULL DEFAULT 0,
    conceptual_q    INTEGER NOT NULL DEFAULT 0,
    generative_q    INTEGER NOT NULL DEFAULT 0,
    topics          TEXT[],
    highlights      JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id, org_id, snapshot_date, period)
);

CREATE INDEX idx_ps_student ON progress_snapshots(student_id);
CREATE INDEX idx_ps_org ON progress_snapshots(org_id);
CREATE INDEX idx_ps_date ON progress_snapshots(snapshot_date);

-- Daily AI cost/usage aggregates per org. Written by Edge Function.
-- Service-role only writes.
CREATE TABLE ai_usage_daily (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    usage_date      DATE NOT NULL,
    interaction_count INTEGER NOT NULL DEFAULT 0,
    total_input_tokens BIGINT NOT NULL DEFAULT 0,
    total_output_tokens BIGINT NOT NULL DEFAULT 0,
    total_cost_micros BIGINT NOT NULL DEFAULT 0,
    breakdown       JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, usage_date)
);

CREATE INDEX idx_aud_org ON ai_usage_daily(org_id);
CREATE INDEX idx_aud_date ON ai_usage_daily(usage_date);

-- Append-only analytics events. Service-role only writes.
-- Partition by created_at (monthly) when volume grows.
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID,
    student_id      UUID,
    org_id          UUID,
    event_type      TEXT NOT NULL,
    resource_type   TEXT,
    resource_id     UUID,
    properties      JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_org ON events(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created ON events(created_at);

-- ============================================================
-- SYSTEM LAYER
-- ============================================================

-- Append-only audit trail. Service-role only writes.
-- No end-user INSERT to prevent log spoofing.
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID REFERENCES profiles(id),
    org_id          UUID REFERENCES organizations(id),
    action          TEXT NOT NULL,
    resource_type   TEXT,
    resource_id     UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_org ON audit_logs(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_audit_actor ON audit_logs(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_created ON audit_logs(created_at);

CREATE TABLE invitations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invited_by      UUID NOT NULL REFERENCES profiles(id),
    email           TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN (
                        'parent', 'family_admin', 'teacher', 'school_admin'
                    )),
    token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_org ON invitations(org_id);
CREATE INDEX idx_inv_email ON invitations(email);
CREATE INDEX idx_inv_token ON invitations(token);

-- Billing/plan info per org. Writes are service-role only (Stripe webhooks).
CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan                    TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'family', 'classroom', 'school', 'district')),
    status                  TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled')),
    seat_limit              INTEGER,
    ai_monthly_budget_micros BIGINT,
    stripe_customer_id      TEXT,
    stripe_subscription_id  TEXT,
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subs_org ON subscriptions(org_id);

CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RPC: CONTROLLED STUDENT CREATION
-- ============================================================
--
-- FAMILY FLOW (org type = 'family'):
--   Parent or family_admin calls create_student().
--   → student created + org assignment + caller linked as guardian.
--   The p_relationship param controls the guardian relationship label.
--
-- SCHOOL FLOW (org type = 'school' or 'district'):
--   School_admin or teacher calls create_student().
--   → student created + org assignment only. NO guardian link.
--   Guardian is added separately: school invites a parent, parent
--   accepts, and an org admin adds the guardian via sg_insert policy
--   or the parent calls create_student() in their own family org.
--
-- PLATFORM ADMIN:
--   Can create in any org. Guardian link follows the org type rule.
--

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
    -- 1. Validate org exists and get its type
    SELECT type INTO v_org_type
    FROM public.organizations WHERE id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization % does not exist', p_org_id;
    END IF;

    -- 2. Check caller authorization
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

    -- 3. Serialize + idempotent dedupe
    --    A single UI submit can invoke the server action twice (e.g. React Strict Mode
    --    in dev). Without this, two identical students appear. The advisory lock makes
    --    concurrent identical requests run one-at-a-time; the SELECT returns an existing
    --    row when the same identity was already added to this org.
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

    -- 4. Create student record
    INSERT INTO public.students (full_name, display_name, date_of_birth, grade_level)
    VALUES (p_full_name, p_display_name, p_date_of_birth, p_grade_level)
    RETURNING id INTO v_student_id;

    -- 5. Assign student to org
    INSERT INTO public.student_org_assignments (student_id, org_id)
    VALUES (v_student_id, p_org_id);

    -- 6. Guardian link: ONLY for family orgs where caller is parent/family_admin.
    --    School staff (teachers, school_admins) are never auto-linked as guardians.
    --    Platform admins follow the org type rule.
    IF v_org_type = 'family'
       AND (v_caller_role IN ('family_admin', 'parent') OR v_is_platform_admin)
    THEN
        INSERT INTO public.student_guardians (student_id, guardian_id, relationship, is_primary)
        VALUES (v_student_id, v_caller, p_relationship, true);
    END IF;

    RETURN v_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- FORWARD REFERENCE
-- ============================================================

ALTER TABLE learning_sessions
    ADD CONSTRAINT fk_ls_summary_artifact
    FOREIGN KEY (summary_artifact_id) REFERENCES ai_artifacts(id);

-- ============================================================
-- FUNCTION PERMISSIONS
-- ============================================================
-- By default PostgreSQL grants EXECUTE to PUBLIC on all functions.
-- For SECURITY DEFINER functions this is dangerous: any role can
-- invoke them and they run with the definer's (owner's) privileges.
-- Revoke from PUBLIC, then grant only to the roles that need them.

-- Trigger-only functions: no direct invocation needed.
REVOKE ALL ON FUNCTION set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION enforce_classroom_school_org() FROM PUBLIC;
REVOKE ALL ON FUNCTION enforce_session_consistency() FROM PUBLIC;

-- create_student(): callable by logged-in users (RPC).
REVOKE ALL ON FUNCTION create_student(UUID, TEXT, TEXT, DATE, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_student(UUID, TEXT, TEXT, DATE, TEXT, TEXT) TO authenticated;
