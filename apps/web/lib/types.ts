export type PublishedSchedule = {
  id: string;
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
  published_at: string;
};

