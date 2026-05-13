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
  source_ref: string | null;
  note: string | null;
  raw_text: string | null;
  source_page: number | null;
  parsed_at: string | null;
  confidence: number | null;
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
