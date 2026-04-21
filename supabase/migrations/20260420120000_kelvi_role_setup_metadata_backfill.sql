-- Mark existing users as having completed product role selection so they are not
-- forced through `/role-setup` again after this feature ships.
UPDATE public.profiles p
SET metadata = coalesce(p.metadata, '{}'::jsonb)
  || jsonb_build_object('kelvi_completed_role_setup', true)
WHERE
  EXISTS (
    SELECT 1 FROM public.org_memberships om
    WHERE om.profile_id = p.id AND om.is_active = true
  )
  OR (coalesce(p.metadata, '{}'::jsonb)->>'kelvi_segment') = 'student';
