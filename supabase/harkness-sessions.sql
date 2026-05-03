-- Add student_email to session logs
alter table harkness_session_logs add column if not exists student_name text;
alter table harkness_session_logs add column if not exists student_email text;

-- Student sessions table (maps to problem sets, not just classes)
create table if not exists harkness_student_sessions (
  id uuid primary key default gen_random_uuid(),
  problem_set_id uuid references harkness_problem_sets(id) on delete cascade,
  problem_id uuid references problems(id) on delete set null,
  student_name text not null,
  student_email text,
  messages jsonb default '[]',
  message_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table harkness_student_sessions enable row level security;

-- Students can insert (no auth)
create policy "public insert student sessions" on harkness_student_sessions
  for insert with check (true);

-- Students can update their own session (by id, no auth needed)
create policy "public update student sessions" on harkness_student_sessions
  for update using (true);

-- Teachers read sessions for their problem sets
create policy "teachers read student sessions" on harkness_student_sessions
  for select using (
    exists (
      select 1 from harkness_problem_sets
      where id = problem_set_id
      and profile_id = auth.uid()
    )
  );
