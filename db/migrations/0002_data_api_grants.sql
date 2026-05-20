grant usage on schema public to anon, service_role;

grant select on table hospitals to anon;
grant select on table sync_runs to anon;
grant select on table published_schedules to anon;

grant all privileges on table hospitals to service_role;
grant all privileges on table sync_runs to service_role;
grant all privileges on table published_schedules to service_role;
grant all privileges on table rejected_schedules to service_role;
grant all privileges on table schedule_changes to service_role;

grant usage, select on all sequences in schema public to service_role;
