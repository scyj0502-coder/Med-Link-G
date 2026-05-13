alter table published_schedules
add column if not exists note text not null default '',
add column if not exists raw_text text not null default '',
add column if not exists source_page integer,
add column if not exists parsed_at timestamptz;

