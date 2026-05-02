-- ── Kelvi Harkness Schema ──────────────────────────────────────────────────────
-- These tables hold the Exeter Math 2 problem bank and teacher-created problem sets.
-- Run this in Supabase SQL Editor after setting up the main Kelvi School schema.

-- Exeter problems (819 Math 2 problems)
create table if not exists exeter_problems (
  id uuid primary key default gen_random_uuid(),
  problem_number int not null,
  course text not null default 'Math2',
  topic text,
  body text not null,
  created_at timestamptz default now()
);

create unique index if not exists exeter_problems_num_course on exeter_problems(problem_number, course);
alter table exeter_problems enable row level security;
create policy "anyone reads exeter problems" on exeter_problems for select using (true);

-- Exeter commentary (teacher notes from PEA math department)
create table if not exists exeter_commentary (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid references exeter_problems(id) on delete cascade unique,
  teacher_notes text,
  answers text[],
  objectives text[],
  created_at timestamptz default now()
);

alter table exeter_commentary enable row level security;
create policy "anyone reads exeter commentary" on exeter_commentary for select using (true);

-- Exeter official answers (from Math 2 answer key PDF)
create table if not exists exeter_solutions (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid references exeter_problems(id) on delete cascade unique,
  solution_text text,
  course text default 'Math2',
  created_at timestamptz default now()
);

alter table exeter_solutions enable row level security;
create policy "anyone reads exeter solutions" on exeter_solutions for select using (true);

-- Teacher-created Harkness problem sets
create table if not exists harkness_problem_sets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references auth.users(id) on delete cascade,
  title text not null,
  problem_numbers int[],
  problem_data jsonb default '[]',
  visibility text default 'anyone' check (visibility in ('anyone', 'private')),
  brief text,
  ai_solutions text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table harkness_problem_sets enable row level security;
create policy "teachers manage own sets" on harkness_problem_sets for all using (profile_id = auth.uid());
create policy "public reads sets" on harkness_problem_sets for select using (visibility = 'anyone');
