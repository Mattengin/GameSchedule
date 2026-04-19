create table if not exists public.availability_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  auto_decline_outside_hours boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.availability_slots (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day_key text not null,
  slot_label text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, day_key, slot_label)
);

create table if not exists public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day_key text not null check (day_key in ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
  starts_at time not null,
  ends_at time not null,
  created_at timestamptz not null default now(),
  constraint availability_windows_end_after_start check (ends_at > starts_at)
);

alter table public.availability_settings enable row level security;
alter table public.availability_slots enable row level security;
alter table public.availability_windows enable row level security;

drop policy if exists "Users can read their availability settings" on public.availability_settings;
create policy "Users can read their availability settings"
on public.availability_settings
for select
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can upsert their availability settings" on public.availability_settings;
create policy "Users can upsert their availability settings"
on public.availability_settings
for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "Users can update their availability settings" on public.availability_settings;
create policy "Users can update their availability settings"
on public.availability_settings
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "Users can read their availability slots" on public.availability_slots;
create policy "Users can read their availability slots"
on public.availability_slots
for select
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can insert their availability slots" on public.availability_slots;
create policy "Users can insert their availability slots"
on public.availability_slots
for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "Users can delete their availability slots" on public.availability_slots;
create policy "Users can delete their availability slots"
on public.availability_slots
for delete
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can read their availability windows" on public.availability_windows;
create policy "Users can read their availability windows"
on public.availability_windows
for select
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Users can insert their availability windows" on public.availability_windows;
create policy "Users can insert their availability windows"
on public.availability_windows
for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "Users can update their availability windows" on public.availability_windows;
create policy "Users can update their availability windows"
on public.availability_windows
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "Users can delete their availability windows" on public.availability_windows;
create policy "Users can delete their availability windows"
on public.availability_windows
for delete
to authenticated
using (auth.uid() = profile_id);
