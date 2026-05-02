-- Raw session log per class per date
create table if not exists harkness_session_logs (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references harkness_classes(id) on delete cascade,
  teacher_id uuid references auth.users(id) on delete cascade,
  date date not null default current_date,
  raw_note text not null,
  created_at timestamptz default now()
);

-- Per-student extracted entries
create table if not exists harkness_student_notes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references harkness_classes(id) on delete cascade,
  member_id uuid references harkness_class_members(id) on delete cascade,
  student_name text not null,
  date date not null default current_date,
  type text check (type in ('homework','question','presentation','observation','absent')),
  content text,
  value boolean,  -- for homework: true = did it, false = didn't
  created_at timestamptz default now()
);

alter table harkness_session_logs enable row level security;
alter table harkness_student_notes enable row level security;

create policy "teachers manage own logs" on harkness_session_logs
  for all using (teacher_id = auth.uid());
create policy "teachers manage own notes" on harkness_student_notes
  for all using (exists (
    select 1 from harkness_classes where id = class_id and teacher_id = auth.uid()
  ));
