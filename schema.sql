-- Run this entire script in the Supabase SQL Editor

-- 1. Create the table (if it doesn't exist)
create table if not exists public.attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  test_id integer not null,
  score integer not null,
  total_questions integer,
  correct integer,
  incorrect integer,
  unanswered integer,
  time_taken integer,
  timestamp timestamptz default now()
);

-- 2. Enable Row Level Security
alter table public.attempts enable row level security;

-- 3. Create Policies (Drop first to allow re-running script)
drop policy if exists "Users can view their own attempts" on public.attempts;
create policy "Users can view their own attempts" 
  on public.attempts for select 
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own attempts" on public.attempts;
create policy "Users can insert their own attempts" 
  on public.attempts for insert 
  with check (auth.uid() = user_id);
