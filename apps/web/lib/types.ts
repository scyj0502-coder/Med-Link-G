export type PublishedSchedule = {
  id: string;
  schedule_key: string;
  hospital_id: string;
  hospital_name: string;
  branch_name: string;
  department: string;
  doctor_name: string;
  weekday: number;
  weekday_label: string;
  period: string;
  room: string | null;
  source_url: string | null;
  source_file_url: string | null;
  source_ref: string | null;
  source_type: string | null;
  source_month: string | null;
  file_hash: string | null;
  parse_status: string | null;
  parse_error: string | null;
  note: string | null;
  raw_text: string | null;
  source_page: number | null;
  parsed_at: string | null;
  fetched_at: string | null;
  start_time: string | null;
  end_time: string | null;
  confidence: number | null;
  confidence_score: number | null;
  published_at: string;
};

export type Hospital = {
  id: string;
  region: string;
  hospital_name: string;
  branch_name: string;
  schedule_url: string | null;
  enabled: boolean;
};

export type SyncRun = {
  id: number;
  hospital_id: string;
  status: string;
  scraped_count: number;
  published_count: number;
  rejected_count: number;
  started_at: string;
  finished_at: string | null;
  error_message?: string | null;
};
