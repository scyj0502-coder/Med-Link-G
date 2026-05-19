create table if not exists personal_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  doctor_key text not null,
  content text not null default '',
  visit_status text not null default 'unvisited',
  last_visit_date date,
  next_reminder text not null default '',
  reminder_at timestamptz,
  tags text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, doctor_key)
);

alter table personal_notes enable row level security;

drop policy if exists "Users can read own personal notes" on personal_notes;
create policy "Users can read own personal notes"
on personal_notes for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own personal notes" on personal_notes;
create policy "Users can create own personal notes"
on personal_notes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own personal notes" on personal_notes;
create policy "Users can update own personal notes"
on personal_notes for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own personal notes" on personal_notes;
create policy "Users can delete own personal notes"
on personal_notes for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on table personal_notes to authenticated;
grant all privileges on table personal_notes to service_role;

create index if not exists idx_personal_notes_user_reminder
on personal_notes(user_id, reminder_at);

create index if not exists idx_personal_notes_user_status
on personal_notes(user_id, visit_status);
