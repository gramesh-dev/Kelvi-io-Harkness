-- Harkness class management
create table if not exists harkness_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references auth.users(id) on delete cascade,
  name text not null,
  course text default 'Math2',
  period text,
  academic_year text,
  created_at timestamptz default now()
);

create table if not exists harkness_class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references harkness_classes(id) on delete cascade,
  student_name text not null,
  student_email text,
  created_at timestamptz default now(),
  unique(class_id, student_name)
);

alter table harkness_classes enable row level security;
alter table harkness_class_members enable row level security;

create policy "teachers manage own classes" on harkness_classes for all using (teacher_id = auth.uid());
create policy "teachers manage own members" on harkness_class_members for all
  using (exists (select 1 from harkness_classes where id = class_id and teacher_id = auth.uid()));
