create table if not exists personal_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  doctor_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, doctor_key)
);

alter table personal_favorites enable row level security;

drop policy if exists "Users can read own favorites" on personal_favorites;
create policy "Users can read own favorites"
on personal_favorites for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own favorites" on personal_favorites;
create policy "Users can create own favorites"
on personal_favorites for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on personal_favorites;
create policy "Users can delete own favorites"
on personal_favorites for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, delete on table personal_favorites to authenticated;
grant all privileges on table personal_favorites to service_role;

create index if not exists idx_personal_favorites_user
on personal_favorites(user_id);
