-- Idempotent: allows organizations.type = 'solo' and org_memberships.role = 'solo_learner'.
-- Required for /role-setup → student (Kelvi Student) and submitStudentSegment inserts.
-- If you see "violates check constraint organizations_type_check", apply this (or run full history via `supabase db push`).

ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_type_check;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_type_check
  CHECK (type IN ('school', 'family', 'district', 'solo'));

ALTER TABLE public.org_memberships DROP CONSTRAINT IF EXISTS org_memberships_role_check;
ALTER TABLE public.org_memberships
  ADD CONSTRAINT org_memberships_role_check
  CHECK (role IN (
    'parent', 'family_admin',
    'teacher', 'school_admin',
    'solo_learner'
  ));
