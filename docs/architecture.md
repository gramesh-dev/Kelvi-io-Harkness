# Kelvi Production Architecture

> AI-first, multi-tenant, child-safe educational SaaS platform
> Stack: Supabase PostgreSQL · Supabase Auth · Next.js · Anthropic AI

---

## Table of Contents

- [A. Architecture Overview](#a-architecture-overview)
- [B. Entity Relationship Design](#b-entity-relationship-design)
- [C. AI Capabilities — Day One](#c-ai-capabilities--day-one)
- [D. SQL Schema](#d-sql-schema)
- [E. Architectural Decisions](#e-architectural-decisions)
- [F. Multi-Tenant Strategy](#f-multi-tenant-strategy)
- [G. RLS Security Model](#g-rls-security-model)
- [H. AI Runtime Flow](#h-ai-runtime-flow)
- [I. Data Lifecycle & Retention](#i-data-lifecycle--retention)
- [J. Next.js App Structure](#j-nextjs-app-structure)
- [K. Scalability Plan](#k-scalability-plan)
- [L. Compliance / Privacy / Safety](#l-compliance--privacy--safety)
- [M. Common Mistakes to Avoid](#m-common-mistakes-to-avoid)
- [N. Implementation Phases](#n-implementation-phases)
- [O. Production-Readiness Review](#o-production-readiness-review)
- [P. Security Hardening (Applied)](#p-security-hardening-applied)

---

## A. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENTS: Next.js App (Vercel) / Mobile (future)            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Public pages │  │ Auth'd app   │  │ Admin console     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────────┘ │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│  NEXT.JS SERVER LAYER (Vercel)                              │
│                                                              │
│  Route Handlers:          Server Actions:                    │
│  ├─ /api/ai/chat          ├─ createStudent()                │
│  ├─ /api/ai/generate      ├─ inviteMember()                │
│  ├─ /api/webhooks/stripe   ├─ submitAssignment()            │
│  └─ /api/auth/callback     └─ updateProgress()             │
│                                                              │
│  AI Gateway:                                                 │
│  ├─ prompt assembly + system prompt injection               │
│  ├─ moderation pre-check                                    │
│  ├─ provider routing (Anthropic / OpenAI / future)          │
│  ├─ response persistence                                    │
│  ├─ token/cost recording                                    │
│  └─ moderation post-check                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE                                                    │
│                                                              │
│  ┌──────────┐ ┌───────────────────────┐ ┌────────────────┐ │
│  │ Auth     │ │ PostgreSQL            │ │ Storage        │ │
│  │          │ │                       │ │                │ │
│  │ users,   │ │ TRANSACTIONAL:        │ │ avatars/       │ │
│  │ sessions,│ │  profiles, orgs,      │ │ uploads/       │ │
│  │ JWT      │ │  students, classes,   │ │ exports/       │ │
│  │          │ │  memberships          │ │ ai-artifacts/  │ │
│  │          │ │                       │ │                │ │
│  │          │ │ AI DATA:              │ │                │ │
│  │          │ │  learning_sessions,   │ │                │ │
│  │          │ │  session_messages,    │ │                │ │
│  │          │ │  ai_interactions,     │ │                │ │
│  │          │ │  ai_artifacts         │ │                │ │
│  │          │ │                       │ │                │ │
│  │          │ │ ANALYTICS:            │ │                │ │
│  │          │ │  events,              │ │                │ │
│  │          │ │  progress_snapshots,  │ │                │ │
│  │          │ │  ai_usage_daily       │ │                │ │
│  │          │ │                       │ │                │ │
│  │          │ │ SYSTEM:               │ │                │ │
│  │          │ │  audit_logs,          │ │                │ │
│  │          │ │  invitations,         │ │                │ │
│  │          │ │  parental_consents    │ │                │ │
│  └──────────┘ └───────────────────────┘ └────────────────┘ │
│                                                              │
│  ┌──────────────────┐  ┌─────────────┐                     │
│  │ Edge Functions   │  │ Realtime    │                     │
│  │  summarize-sess  │  │  (future:   │                     │
│  │  generate-prog   │  │   live cls) │                     │
│  │  archive-old     │  │             │                     │
│  │  daily-usage-agg │  │             │                     │
│  └──────────────────┘  └─────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| AI gateway in Next.js, not Edge Functions | Synchronous chat needs low latency. Vercel route handlers have better cold start than Supabase Edge Functions. Edge Functions used for async work only. |
| Students separate from profiles | Children age 5–8 cannot have auth accounts. Mixing them with auth-linked profiles creates nullable FK hell and broken RLS assumptions. |
| Platform roles separate from org roles | A platform admin doesn't "belong to" any org. Mixing global and scoped roles in one table requires contorted queries. |
| All AI tables in Postgres from day one | Avoids premature optimization into a separate system. Postgres handles this fine to 10M+ messages. Partitioning and archival designed in now for when it's needed. |
| Events table for analytics | Captures user actions without polluting transactional tables. Append-only, partitioned, archivable. |

---

## B. Entity Relationship Design

```
auth.users (Supabase-managed)
    │ 1:1
    ▼
profiles (adults / login-capable users only)
    │
    ├─── platform_roles (platform_admin — global, not org-scoped)
    │
    ├─── org_memberships ─── organizations (school | family | district)
    │    (role: parent,           │
    │     teacher,                ├── classrooms (school-only, FK + CHECK)
    │     school_admin,           │       │
    │     family_admin)           │       ├── classroom_teachers → profiles
    │                             │       └── classroom_students → students
    ├─── student_guardians        │
    │    (guardian → student)     ├── subscriptions
    │                             └── ai_usage_daily
    │
students (NOT auth users — separate entity)
    │
    ├── student_org_assignments → organizations
    ├── student_classroom_assignments → classrooms
    ├── student_guardians → profiles (guardians)
    │
    ├── learning_sessions
    │       ├── session_messages
    │       │       └── ai_interactions (each API call)
    │       └── ai_artifacts (summaries, insights)
    │
    ├── submissions → assignments
    ├── progress_snapshots
    └── parental_consents → profiles (consenting adult)

assignments → classrooms (created by teachers)
invitations → organizations (pending joins)
events (analytics — append-only)
audit_logs (system — append-only)
```

### Table Classification

| Category | Tables | Characteristics |
|----------|--------|-----------------|
| **Transactional** | profiles, organizations, org_memberships, students, student_guardians, classrooms, classroom_teachers, classroom_students, student_org_assignments, assignments, submissions, subscriptions, invitations, parental_consents | Strong consistency, frequent reads/writes, core business logic |
| **AI Data** | learning_sessions, session_messages, ai_interactions, ai_artifacts | High write volume, append-heavy, partitioned, archivable |
| **Analytics** | events, progress_snapshots, ai_usage_daily | Append-only, aggregated, feeds dashboards and reporting |
| **System** | platform_roles, audit_logs | Append-only (audit_logs), rarely written (platform_roles) |

---

## C. AI Capabilities — Day One

| Capability | Implementation | Sync/Async |
|------------|---------------|------------|
| AI tutoring chat | Next.js `/api/ai/chat` → provider → persist to session_messages + ai_interactions | Synchronous |
| Moderation pre-check | Keyword filter + optional AI classification before sending child's message to main model | Synchronous (fast path) |
| Moderation post-check | Flag check on AI response before showing to child | Synchronous |
| Session summaries | Edge Function triggered on session end → writes ai_artifact | Asynchronous |
| Progress insights | Edge Function (nightly cron) → reads sessions → writes progress_snapshots | Asynchronous |
| Quest/assignment generation | Next.js `/api/ai/generate` → persist to ai_artifacts, link to assignment | Synchronous |
| Token/cost tracking | Recorded per ai_interaction, aggregated daily into ai_usage_daily | Sync write, async aggregation |
| Provider abstraction | `ai_interactions.provider` + `ai_interactions.model` columns. Gateway routes based on config, not hardcoded. | N/A (design pattern) |

---

## D. SQL Schema

> Full schema: [`supabase/schema.sql`](../supabase/schema.sql)
> RLS policies: [`supabase/rls.sql`](../supabase/rls.sql)

### Core Tables Summary

**Identity Layer**

```sql
profiles (
    id          UUID PK → auth.users(id),
    email       TEXT,
    full_name   TEXT NOT NULL,
    avatar_url  TEXT,
    timezone    TEXT DEFAULT 'UTC',
    metadata    JSONB,
    created_at, updated_at
)

platform_roles (
    id          UUID PK,
    profile_id  UUID FK → profiles,
    role        TEXT CHECK ('platform_admin', 'platform_support'),
    granted_at, granted_by
    UNIQUE(profile_id, role)
)
```

**Organization Layer**

```sql
organizations (
    id          UUID PK,
    type        TEXT CHECK ('school', 'family', 'district'),
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE,
    parent_id   UUID FK → organizations,  -- district → school
    settings    JSONB,
    is_active   BOOLEAN,
    created_at, updated_at
)

org_memberships (
    id          UUID PK,
    org_id      UUID FK → organizations,
    profile_id  UUID FK → profiles,
    role        TEXT CHECK ('parent', 'family_admin', 'teacher', 'school_admin'),
    is_active   BOOLEAN,
    joined_at   TIMESTAMPTZ,
    UNIQUE(org_id, profile_id, role)
)
```

**Student Layer**

```sql
students (
    id              UUID PK,
    profile_id      UUID FK → profiles (OPTIONAL — for older students with login),
    full_name       TEXT NOT NULL,
    display_name    TEXT,
    date_of_birth   DATE,
    grade_level     TEXT,
    avatar_url      TEXT,
    is_active       BOOLEAN,
    metadata        JSONB,
    created_at, updated_at
)

student_org_assignments (student_id, org_id)     -- which orgs a student belongs to
student_guardians (student_id, guardian_id)        -- parent/guardian links
parental_consents (student_id, consenting_adult)   -- COPPA/FERPA consent records
```

**Classroom Layer**

```sql
classrooms (org_id, name, grade_level, subject, academic_year)
classroom_teachers (classroom_id, profile_id)     -- teacher assignments
classroom_students (classroom_id, student_id)     -- student assignments
```

**AI / Learning Session Layer**

```sql
learning_sessions (
    id, student_id, org_id, classroom_id, initiated_by,
    mode CHECK ('questioning', 'guided', 'exploration'),
    topic, started_at, ended_at, summary_artifact_id, message_count
)

session_messages (
    session_id, ordinal, role CHECK ('user', 'assistant', 'system'),
    content, question_type CHECK ('P', 'C', 'G'), created_at
)

ai_interactions (
    session_id, message_id, org_id, student_id,
    interaction_type CHECK ('chat', 'summary', 'insight', 'quest_generation', 'moderation', 'explanation'),
    provider, model, system_prompt,
    input_tokens, output_tokens, cost_micros, latency_ms,
    moderation_flags JSONB, error, created_at
)

ai_artifacts (
    interaction_id, org_id, student_id,
    artifact_type CHECK ('session_summary', 'progress_insight', 'quest', 'explanation', 'hint', 'report'),
    content JSONB, is_visible, created_at
)
```

**Analytics Layer**

```sql
progress_snapshots (student_id, org_id, snapshot_date, period, sessions_count, messages_count, ...)
ai_usage_daily (org_id, usage_date, interaction_count, total_input_tokens, total_output_tokens, total_cost_micros)
events (actor_id, student_id, org_id, event_type, resource_type, resource_id, properties, created_at)
```

**System Layer**

```sql
audit_logs (actor_id, org_id, action, resource_type, resource_id, old_values, new_values, ip_address, created_at)
invitations (org_id, invited_by, email, role, token, status, expires_at)
subscriptions (org_id, plan, status, seat_limit, ai_monthly_budget_micros, stripe_*)
```

---

## E. Architectural Decisions

| # | Question | Decision | Reasoning |
|---|----------|----------|-----------|
| 1 | Platform admin separate from org roles? | **Yes.** `platform_roles` table, separate from `org_memberships`. | A platform admin doesn't "belong to" an org. Mixing them in `org_memberships` means every query needs a special "null org" case. Separate table = clean queries, clean RLS. |
| 2 | Students separate from profiles? | **Yes.** `students` table with optional `profile_id` FK. | A 6-year-old cannot have an auth account. If students = profiles = auth.users, you'd need nullable auth references, fake emails, and broken RLS assumptions. Separate table lets young students exist without auth, and older students link to a profile when ready. |
| 3 | Family vs school managed students? | Same `students` table, differentiated by `student_org_assignments`. | A student can belong to both a family org and a school org simultaneously. Family-managed: parent creates student, assigns to family org. School-managed: admin creates student, assigns to school org. |
| 4 | Invitation flow? | `invitations` table with token, role, org_id, expiry. On accept: create `org_membership`, mark invitation accepted. | Supports teacher invites, parent invites, admin invites. Token-based so invitee doesn't need an account yet. |
| 5 | Parental consent? | `parental_consents` table, per-consent-type, with grant/revoke timestamps. | COPPA requires verifiable parental consent before collecting child data. Each consent type tracked separately. Revocable. |
| 6 | AI provider abstraction? | `ai_interactions.provider` + `ai_interactions.model` columns. AI gateway code routes based on config. | Swap Anthropic for OpenAI by changing config, not schema. Cost tracking works per-provider automatically. |
| 7 | Prompt/output storage? | System prompts in `ai_interactions.system_prompt`. Outputs in `session_messages` (chat) or `ai_artifacts` (generated content). | Separates conversation flow from generated artifacts. System prompts recorded for auditability. |
| 8 | Moderation flags? | `ai_interactions.moderation_flags` JSONB array. | Lightweight, extensible. No separate table needed until moderation volume warrants it. |
| 9 | Cost tracking? | Per-interaction: `ai_interactions.cost_micros`. Daily aggregate: `ai_usage_daily`. Budget limit: `subscriptions.ai_monthly_budget_micros`. | Microdollars (1 cent = 10,000 micros) avoid floating point. Check budget before each AI call. |
| 10 | Classrooms constrained to schools? | **Trigger-enforced.** `trg_classroom_school_only` rejects INSERT/UPDATE if `org_id` is not a school-type org. | PostgreSQL CHECK constraints can't cross-reference other tables. A BEFORE trigger is the correct database-level enforcement. |
| 11 | Audit logs + events writeable by end users? | **No. Service-role only writes.** No end-user INSERT policies. | Allowing client-side writes enables log spoofing (fake audit entries) and analytics poisoning (fake events). All writes go through backend server actions using the service-role client. |
| 12 | Student creation open to any org member? | **No. Controlled RPC only.** `create_student()` SECURITY DEFINER function validates org membership. **Family flow:** creates student + org assignment + guardian link. **School flow:** creates student + org assignment only — no auto-guardian. | Direct INSERT via RLS let users create orphaned students. The RPC enforces atomicity, authorization, and org-type-aware guardian logic. |
| 13 | Can anyone attach themselves as a guardian? | **No.** Guardian INSERT requires the caller already has admin access to an org the student belongs to. | The old policy (`guardian_id = auth.uid()`) let any user become guardian of any student by knowing the UUID. Now only org admins of a shared org can add guardians. For family orgs, the initial guardian is created by `create_student()` RPC. For school orgs, guardians are linked separately after parent invitation. |
| 14 | Can end users create school/district orgs? | **No.** End-user INSERT restricted to `type = 'family'` only. School/district creation requires platform admin or service role. | Prevents random users from creating fake school orgs and inviting people into them. |
| 15 | Soft deletes / retention? | `is_active` boolean on profiles, students, orgs, classrooms. Hard delete only for GDPR/compliance via service role. | `is_active` is simpler for most cases. Hard delete path exists but is admin-only. |

---

## F. Multi-Tenant Strategy

**Decision: Single `organizations` table with type discriminator.**

```
organizations
├── type = 'district'  (parent of schools)
│   └── parent_id = NULL
├── type = 'school'    (belongs to optional district)
│   └── parent_id → district org
└── type = 'family'    (standalone)
    └── parent_id = NULL
```

**Why unified, not separate tables:**
- A student can belong to both a school org AND a family org using the same membership pattern
- RLS policies are simpler — one set of policies checks `org_memberships`
- Billing/subscriptions attach to one table
- Districts are just another org type with parent-child relationships
- Adding new org types (tutoring centers, homeschool co-ops) requires zero schema changes

**Tenant isolation enforced at three levels:**
1. **Database (RLS):** Every query filtered by org membership via `is_org_member()`, `is_org_admin()`
2. **Application:** Supabase client initialized with user's JWT; RLS activates automatically
3. **API routes:** Server actions verify org context before any write operation

---

## G. RLS Security Model

> Full RLS SQL: [`supabase/rls.sql`](../supabase/rls.sql)

### Helper Functions (SECURITY DEFINER)

```sql
is_platform_admin()           -- Is caller a global admin?
is_org_member(org_id)         -- Is caller a member of this org?
is_org_admin(org_id)          -- Is caller an admin of this org?
can_access_student(student_id) -- Can caller see this student?
is_classroom_teacher(class_id) -- Is caller a teacher in this classroom?
```

All helpers are `SECURITY DEFINER` — they query membership tables as the DB owner, avoiding recursive RLS. They are `STABLE` for query planner optimization.

### Access Matrix

| Data | Student (self) | Parent/Guardian | Teacher | School Admin | Family Admin | Platform Admin |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| Own profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Student record | — | Own children | Class students | School students | Family students | All |
| Learning sessions | — | Own children's | Class students' | School's | Family's | All |
| Session messages | — | Own children's | Class students' | School's | Family's | All |
| AI interactions | — | — | — | Own school | — | All |
| Assignments | — | — | Own classroom | School's | — | All |
| Progress | — | Own children's | Class students' | School's | Family's | All |
| AI usage/cost | — | — | — | Own school | Own family | All |
| Audit logs | — | — | — | Own school | Own family | All |
| Subscriptions | — | — | — | Own school | Own family | All |

### Key RLS Design Principles

1. **Students don't have `auth.uid()`** — access to student data is always mediated through an adult's identity
2. **`org_id` on `learning_sessions`** is the critical tenant boundary — a school admin can't see family-context sessions and vice versa
3. **AI interactions** are org-admin-only readable (cost/usage data, system prompts)
4. **Audit logs and events have NO end-user write policies** — all writes go through service-role (backend server actions). This prevents log spoofing and analytics poisoning.
5. **Service role** bypasses RLS for Edge Functions doing async summarization, aggregation, and system writes (audit logs, events, ai_interactions, progress_snapshots)
6. **Student creation goes through `create_student()` RPC** — no direct INSERT policy. The RPC validates org membership and atomically creates student + org assignment + guardian link.
7. **`FORCE ROW LEVEL SECURITY`** is applied to child-sensitive and system-critical tables (`students`, `student_guardians`, `platform_roles`, `audit_logs`, `events`, etc.) so even the table owner role is subject to policies.
8. **Profiles visibility is narrowed** — users only see profiles they have a specific relationship with (co-guardians, co-classroom teachers, org admins), not every member of every shared org.
9. **Organization creation is type-restricted** — end users can only create `family` orgs. School and district orgs require platform admin or service-role.

### Testing RLS

```sql
-- Test as a specific user
SET request.jwt.claims = '{"sub": "user-uuid-here"}';
SET ROLE authenticated;

-- Try to read another org's data — should return 0 rows
SELECT * FROM students WHERE id = 'other-orgs-student-uuid';

-- Reset
RESET ROLE;
```

---

## H. AI Runtime Flow

### Synchronous: Chat Request

```
Student sends message
    │
    ▼
Next.js /api/ai/chat
    │
    ├─ 1. Authenticate (Supabase JWT)
    ├─ 2. Authorize (verify caller can act for this student)
    ├─ 3. Check budget (ai_usage_daily vs subscription limit)
    ├─ 4. Load session context (recent messages from session_messages)
    ├─ 5. Moderation pre-check (keyword blocklist + optional classifier)
    ├─ 6. Assemble prompt (system prompt + context + user message)
    ├─ 7. Call AI provider (route by config: Anthropic/OpenAI)
    ├─ 8. Moderation post-check (scan response for unsafe content)
    ├─ 9. Persist:
    │      ├─ INSERT session_messages (user message)
    │      ├─ INSERT session_messages (assistant response)
    │      └─ INSERT ai_interactions (model, tokens, cost, latency, flags)
    ├─ 10. Emit event (INSERT events for analytics)
    └─ 11. Return response to client
```

### Asynchronous: Session Enrichment

```
Session ends (client calls /api/ai/end-session)
    │
    ├─ Mark learning_session.ended_at
    └─ Trigger Edge Function: summarize-session
         │
         ├─ Load all session_messages for session
         ├─ Call AI provider with summarization prompt
         ├─ INSERT ai_artifacts (type = 'session_summary')
         ├─ INSERT ai_interactions (for the summary call)
         └─ UPDATE learning_sessions.summary_artifact_id

Nightly cron (Edge Function: generate-progress)
    │
    ├─ For each student with sessions in last 24h:
    │    ├─ Aggregate session data
    │    ├─ Optionally call AI for insight generation
    │    └─ UPSERT progress_snapshots
    │
    └─ For each org:
         └─ Aggregate ai_interactions → UPSERT ai_usage_daily
```

---

## I. Data Lifecycle & Retention

| Data | Hot (Postgres) | Warm (Postgres, older) | Cold (Archive) |
|------|---------------|----------------------|----------------|
| Profiles, orgs, memberships | Forever | — | — |
| Students, guardians | Forever | — | — |
| Learning sessions | Last 12 months | 12–36 months | 36+ months → Storage bucket as JSON |
| Session messages | Last 6 months | 6–12 months (partitioned) | 12+ months → archive |
| AI interactions | Last 3 months | 3–12 months | 12+ months → archive, keep aggregates |
| Progress snapshots | Forever (small, aggregated) | — | — |
| Events | Last 3 months | Archive or feed to warehouse | — |
| Audit logs | Last 12 months | 12–36 months | 36+ months → cold storage |

### Partitioning Strategy (implement when data grows)

- `session_messages`: partition by `created_at` monthly
- `events`: partition by `created_at` monthly
- `ai_interactions`: partition by `created_at` monthly

---

## J. Next.js App Structure

```
kelvi/
├── app/
│   ├── (marketing)/              # Public — no auth
│   │   ├── page.tsx              # Landing page
│   │   ├── pricing/
│   │   └── about/
│   ├── (auth)/                   # Auth flows
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── invite/[token]/page.tsx
│   │   └── callback/route.ts
│   ├── (app)/                    # Authenticated — role-aware
│   │   ├── layout.tsx            # Auth guard, org context, sidebar
│   │   ├── dashboard/page.tsx    # Routes by role
│   │   ├── family/
│   │   │   ├── page.tsx          # Family dashboard
│   │   │   ├── children/[id]/    # Child detail + progress
│   │   │   └── settings/
│   │   ├── school/
│   │   │   ├── page.tsx          # School admin dashboard
│   │   │   ├── classrooms/[id]/
│   │   │   ├── teachers/
│   │   │   └── students/[id]/
│   │   ├── classroom/[id]/
│   │   │   ├── page.tsx          # Classroom view
│   │   │   ├── assignments/
│   │   │   └── students/
│   │   ├── learn/                # AI tutoring
│   │   │   ├── page.tsx          # Select student + mode
│   │   │   └── session/[id]/     # Active chat
│   │   ├── quest/page.tsx        # Quest builder
│   │   └── settings/
│   └── api/
│       ├── ai/
│       │   ├── chat/route.ts     # Sync: AI tutoring
│       │   └── generate/route.ts # Sync: quest/content gen
│       └── webhooks/
│           └── stripe/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server component client
│   │   ├── service.ts            # Service-role client (backend)
│   │   └── middleware.ts
│   ├── ai/
│   │   ├── gateway.ts            # Provider routing, prompt assembly
│   │   ├── moderation.ts         # Pre/post safety checks
│   │   ├── providers/
│   │   │   ├── anthropic.ts
│   │   │   └── openai.ts
│   │   └── prompts/
│   │       ├── questioning.ts
│   │       ├── guided.ts
│   │       └── exploration.ts
│   └── utils/
├── components/
│   ├── ui/
│   ├── chat/
│   ├── dashboard/
│   └── forms/
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql
│   │   └── 002_rls.sql
│   ├── functions/                # Edge Functions
│   │   ├── summarize-session/
│   │   ├── generate-progress/
│   │   └── aggregate-usage/
│   ├── seed.sql
│   └── config.toml
├── middleware.ts                  # Next.js auth middleware
└── .env.local                    # NEVER committed
```

---

## K. Scalability Plan

### What Stays in PostgreSQL

- All relational data (profiles, orgs, memberships, students)
- Recent learning sessions and messages (last 6–12 months)
- Progress snapshots (aggregated, small)
- AI usage aggregates

### What Moves Out Later

- Raw session messages → archive to object storage or data warehouse
- Analytics events → feed to warehouse (BigQuery, etc.)
- Full-text search → `pg_trgm` first, Typesense later if needed

### Scaling Triggers

| Trigger | Action |
|---------|--------|
| 10K+ concurrent sessions | Add connection pooling (Supabase has this built in) |
| 1M+ session messages | Partition `session_messages` by month |
| Complex analytics slowing app | Move reporting to a read replica |
| 100+ schools | Review RLS query plans, add materialized views for dashboards |
| AI cost > $1K/month | Implement response caching for repeated questions |

### Indexing Strategy

Every foreign key used in RLS helper functions is indexed. Key composite indexes:

```sql
idx_om_org_role      ON org_memberships(org_id, role)
idx_sm_session       ON session_messages(session_id, ordinal)
idx_ai_org           ON ai_interactions(org_id)
idx_ai_created       ON ai_interactions(created_at)
idx_ps_student       ON progress_snapshots(student_id)
idx_events_created   ON events(created_at)
```

---

## L. Compliance / Privacy / Safety

| Concern | Design Response |
|---------|----------------|
| **COPPA** | `parental_consents` table. No child account without parent consent. Students don't have auth.users entries by default. |
| **FERPA** | School-managed student data isolated by org RLS. No cross-school leakage. Audit logs for all admin access. |
| **Data minimization** | Students store only: name, DOB, grade. No email, no location, no device fingerprint. |
| **AI safety** | Moderation pre-check (blocklist + classifier) before every child-facing AI call. Post-check on responses. `moderation_flags` recorded on every `ai_interaction`. |
| **Transcript sensitivity** | Session messages contain child inputs. Retention limited (6–12 months hot). Archival encrypted. Deletion on parent request via service role. |
| **Age-appropriate access** | If student login is enabled later, students see ONLY their own sessions and progress via RLS. |
| **Right to erasure** | Service-role endpoint to hard-delete student + cascade all related data. Audit log entry records the erasure. |
| **Vendor data processing** | AI provider calls send only conversation context, never student PII. System prompts reference students by display name only. |

---

## M. Common Mistakes to Avoid

| Mistake | Why It's Dangerous | Kelvi's Design Avoids It By |
|---------|-------------------|---------------------------|
| Students = auth.users | Young children can't have accounts. Forces fake emails, nullable FKs, broken RLS. | Separate `students` table. Optional `profile_id` for older students. |
| API key in client code | Anyone can steal it from browser DevTools. | Server-side only: Vercel env vars, AI gateway in route handlers. |
| Frontend-only authorization | User can call Supabase directly with JWT and bypass app logic. | RLS on every table. Database enforces access. `FORCE ROW LEVEL SECURITY` on sensitive tables. |
| All roles in one table | "Platform admin of which org?" — awkward null org_id. | `platform_roles` separate from `org_memberships`. Platform roles have zero end-user write policies. |
| Letting users INSERT students directly | Orphaned students without org assignments. No guardian link. No audit trail. | Student creation only through `create_student()` RPC which validates org membership and creates all links atomically. |
| Open guardian attachment | Anyone knowing a student UUID can make themselves a guardian. | Guardian INSERT requires caller is already an admin of an org the student belongs to. |
| Allowing end-user audit/event writes | Users can spoof audit logs and poison analytics data. | Zero end-user INSERT policies on `audit_logs` and `events`. Service-role only. |
| No AI cost tracking | Surprise $10K bill from a student spamming chat. | `ai_interactions.cost_micros` per call. `ai_usage_daily` aggregates. Budget enforcement in gateway. |
| All transcripts in hot DB forever | 1B rows in 2 years. Queries crawl. | Retention plan. Partitioning. Progress snapshots for dashboards. |
| No indexes on FK columns in RLS helpers | `can_access_student()` joins 3 tables. Without indexes, every RLS check is a seq scan. | Indexes on every FK used in RLS helpers. |
| Hardcoded AI provider | Locked into Anthropic. Can't test cheaper models or switch. | `provider` + `model` columns. Gateway routes by config. |
| No moderation | Child sends/receives inappropriate content. No record. | Pre/post moderation checks. `moderation_flags` on every interaction. |
| No cross-table integrity on classrooms | Classrooms created under family or district orgs. Broken data model. | `trg_classroom_school_only` trigger rejects classrooms for non-school orgs at the database level. |
| No session consistency checks | Sessions linking unrelated students, orgs, and classrooms. Cross-tenant data leakage. | `trg_session_consistency` trigger verifies student belongs to org and classroom belongs to same org. |

---

## N. Implementation Phases

### Phase 1 — Auth + Identity + AI Chat (Weeks 1–3)

- Supabase project setup, schema migration, RLS
- Supabase Auth (email/password, magic link)
- Profile auto-creation trigger
- Family org creation on signup
- Parent creates students via `create_student()` RPC (atomically links student to org + guardian)
- Parental guardian verification
- AI chat via `/api/ai/chat` with moderation
- `learning_sessions`, `session_messages`, `ai_interactions` persisted
- Token/cost tracking per interaction
- **Ship:** Parent signs up, adds children, children chat with Kelvi

### Phase 2 — Family Dashboard + Progress (Weeks 4–5)

- Session history per child
- Edge Function: session summarization → `ai_artifacts`
- Edge Function: nightly progress aggregation → `progress_snapshots`
- Family dashboard showing children's progress
- Parental consent flow
- **Ship:** Parents see what their children are learning

### Phase 3 — Schools + Classrooms (Weeks 6–8)

- School org creation + admin onboarding
- Invitation system (invite teachers by email)
- Classroom creation, teacher + student assignment
- Teacher dashboard (class view, per-student sessions)
- Quest Builder saves to `assignments` + `ai_artifacts`
- Students see assigned quests
- **Ship:** Schools onboard, teachers manage classes

### Phase 4 — Billing + Polish (Weeks 9–11)

- Stripe integration → `subscriptions`
- Plan-based limits (seat count, AI budget)
- `ai_usage_daily` aggregation + cost dashboard
- Onboarding wizards (family flow, school flow)
- Storage buckets (avatars, uploads)
- Email notifications

### Phase 5 — Scale + Expand (Weeks 12+)

- District support (`parent_id` on orgs)
- SSO/SAML for school districts
- Partition `session_messages` and `events` by month
- Archival Edge Function for old sessions
- Realtime for live classroom features
- Student self-login for older students
- Reporting exports

---

## O. Production-Readiness Review

### Self-Critique (Principal Engineer Review)

**1. RLS performance risk on `can_access_student()`**

This function joins `student_guardians`, `classroom_teachers + classroom_students`, and `org_memberships + student_org_assignments`. On tables with millions of rows, this is called per-row.

*Mitigation:* All FK columns are indexed. For hot-path queries, filter by `student_id` first (indexed), then RLS checks a small set. Monitor with `EXPLAIN ANALYZE`. If slow, add a materialized `student_access_cache` table.

**2. Session message volume**

A 30-minute session could have 40+ messages. 10K active students = 400K messages/month. In 2 years, 10M+ rows.

*Mitigation:* Partitioning by `created_at` designed in. Dashboards read from `progress_snapshots`, not raw messages.

**3. AI cost runaway**

No hard stop if a student sends 1000 messages in a session.

*Required:* Add `max_messages_per_session` to org settings. AI gateway checks `message_count` on `learning_sessions` before each call. Add `max_daily_interactions` per student.

**4. Cross-tenant data leakage check**

A student in both a school and family org — can the school admin see family sessions?

*Analysis:* Sessions have `org_id`. School admin access checks `is_org_admin(org_id)`. Family sessions have family `org_id`. **No leakage.** The `org_id` on `learning_sessions` is the critical tenant boundary.

**5. `platform_roles` bootstrap** ✅ RESOLVED

Without a restrictive INSERT policy, any authenticated user could grant themselves platform_admin.

*Fix applied:* All end-user INSERT/UPDATE/DELETE policies removed from `platform_roles`. Only service-role can mutate. First admin bootstrapped via service role in seed migration.

**6. `events` unbounded growth**

Append-only with no cleanup.

*Mitigation:* Partition by month. Archive partitions older than 3 months to Storage. Implement in Phase 5.

**7. Student profile_id identity escalation**

When a student gets a login, their `profile_id` is set. The new profile's RLS must not grant access to admin data.

*Analysis:* Students with profiles only gain `profiles_select` (own) and `profiles_update` (own). They have no `org_memberships`, so `is_org_member/is_org_admin` return false. **Safe by default.**

**8. Missing rate limiting**

Nothing prevents hammering `/api/ai/chat`.

*Required:* Vercel rate limiting middleware (per-user, per-IP). Per-student daily interaction cap in AI gateway.

---

## P. Security Hardening (Applied)

The following security fixes have been applied to `schema.sql` and `rls.sql`:

| # | Fix | File | What Changed |
|---|-----|------|-------------|
| 1 | Lock down `platform_roles` writes | rls.sql | Removed all end-user INSERT/UPDATE/DELETE policies. Service-role only. |
| 2 | Restrict org creation by type | rls.sql | End users can only INSERT `type = 'family'` orgs. School/district require `is_platform_admin()`. |
| 3 | Remove end-user writes on `audit_logs` & `events` | rls.sql | Removed INSERT policies. All writes through service-role to prevent log spoofing and analytics poisoning. |
| 4 | Tighten `student_guardians` INSERT | rls.sql | Caller must be admin of an org the student already belongs to. Prevents unauthorized self-attachment as guardian. |
| 5 | Controlled student creation via RPC | schema.sql + rls.sql | `create_student()` SECURITY DEFINER function with `SET search_path`. **Family flow:** student + org assignment + guardian link. **School flow:** student + org assignment only (guardian added separately). EXECUTE revoked from PUBLIC, granted to authenticated. |
| 6 | Enforce classrooms belong to school orgs | schema.sql | Added `trg_classroom_school_only` trigger that rejects classrooms for non-school-type organizations. |
| 7 | Enforce session referential consistency | schema.sql | Added `trg_session_consistency` trigger that verifies student belongs to org and classroom belongs to same org. |
| 8 | Narrow profile visibility | rls.sql | Replaced broad "all co-org members visible" with specific relationship checks: co-guardians, co-classroom teachers, org admins only. |
| 9 | Force RLS on sensitive tables | rls.sql | Applied `FORCE ROW LEVEL SECURITY` to `students`, `student_guardians`, `learning_sessions`, `parental_consents`, `platform_roles`, `audit_logs`, `events`, `session_messages`, `student_org_assignments`. Ensures policies apply even to the table owner role. |
| 10 | Service-role-only writes on AI/analytics tables | rls.sql | Removed end-user INSERT/UPDATE/DELETE policies on `ai_interactions`, `ai_artifacts`, `progress_snapshots`, `ai_usage_daily`, `subscriptions`. These are written exclusively by backend server actions or Edge Functions. |
| 11 | Harden all SECURITY DEFINER functions | schema.sql + rls.sql | Added `SET search_path = public` to every SECURITY DEFINER function (prevents search_path hijacking). `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated` on all helper functions and `create_student()`. Trigger-only functions have no public execute. |

---

## Files

| File | Description |
|------|-------------|
| [`supabase/schema.sql`](../supabase/schema.sql) | Production-ready database schema with triggers and RPCs |
| [`supabase/rls.sql`](../supabase/rls.sql) | Row Level Security helper functions and hardened policies |
