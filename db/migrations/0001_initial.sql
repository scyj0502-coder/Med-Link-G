create table if not exists hospitals (
  id text primary key,
  region text not null,
  hospital_name text not null,
  branch_name text not null,
  schedule_url text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sync_runs (
  id bigserial primary key,
  hospital_id text not null references hospitals(id),
  status text not null,
  scraped_count integer not null default 0,
  published_count integer not null default 0,
  rejected_count integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists published_schedules (
  schedule_key text primary key,
  id text generated always as (schedule_key) stored,
  sync_run_id bigint references sync_runs(id),
  hospital_id text not null references hospitals(id),
  hospital_name text not null,
  branch_name text not null,
  department text not null,
  doctor_name text not null,
  weekday smallint not null check (weekday between 0 and 6),
  weekday_label text not null,
  period text not null,
  room text,
  source_url text,
  source_ref text,
  confidence numeric(4, 3) not null default 1,
  published_at timestamptz not null default now()
);

create table if not exists rejected_schedules (
  id bigserial primary key,
  sync_run_id bigint not null references sync_runs(id),
  hospital_id text not null references hospitals(id),
  reason text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists schedule_changes (
  id bigserial primary key,
  sync_run_id bigint references sync_runs(id),
  hospital_id text not null references hospitals(id),
  change_type text not null,
  schedule_key text not null,
  message text not null,
  before_payload jsonb,
  after_payload jsonb,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table hospitals enable row level security;
alter table sync_runs enable row level security;
alter table published_schedules enable row level security;
alter table rejected_schedules enable row level security;
alter table schedule_changes enable row level security;

create policy "Public can read published schedules"
on published_schedules for select
using (true);

create policy "Public can read active hospitals"
on hospitals for select
using (enabled = true);

create index if not exists idx_published_schedules_hospital on published_schedules(hospital_id);
create index if not exists idx_published_schedules_weekday on published_schedules(weekday);
create index if not exists idx_schedule_changes_hospital on schedule_changes(hospital_id);
create index if not exists idx_rejected_schedules_run on rejected_schedules(sync_run_id);

