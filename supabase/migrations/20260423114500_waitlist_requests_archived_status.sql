-- Allow soft-delete/archive workflow for waitlist requests.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'waitlist_requests'
  ) THEN
    ALTER TABLE public.waitlist_requests
      DROP CONSTRAINT IF EXISTS waitlist_requests_status_check;

    ALTER TABLE public.waitlist_requests
      ADD CONSTRAINT waitlist_requests_status_check
      CHECK (status IN ('new', 'reviewed', 'contacted', 'archived'));
  END IF;
END $$;
