alter table sync_runs
add column if not exists error_message text not null default '';

create index if not exists idx_sync_runs_hospital_started
on sync_runs(hospital_id, started_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sync_runs'
      and policyname = 'Public can read sync run status'
  ) then
    create policy "Public can read sync run status"
    on sync_runs for select
    using (true);
  end if;
end $$;

grant select on table sync_runs to anon;
