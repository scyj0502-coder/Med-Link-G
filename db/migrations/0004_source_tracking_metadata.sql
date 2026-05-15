alter table published_schedules
add column if not exists source_file_url text not null default '',
add column if not exists file_hash text not null default '',
add column if not exists parse_status text not null default 'ok',
add column if not exists parse_error text not null default '',
add column if not exists source_type text not null default '',
add column if not exists source_month text not null default '',
add column if not exists fetched_at timestamptz,
add column if not exists start_time text not null default '',
add column if not exists end_time text not null default '',
add column if not exists confidence_score numeric(4, 3);

alter table rejected_schedules
add column if not exists parse_status text not null default 'rejected',
add column if not exists parse_error text not null default '';

