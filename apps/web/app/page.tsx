import ClientDashboard from "./ClientDashboard";
import { createSupabaseBrowserClient } from "../lib/supabase";
import type { Hospital, PublishedSchedule } from "../lib/types";

type HomePageProps = {
  searchParams?: Promise<{
    q?: string;
    department?: string;
    doctor?: string;
  }>;
};

type PageData = {
  hospitals: Hospital[];
  schedules: PublishedSchedule[];
};

const schedulePageSize = 1000;

async function loadPublishedSchedules(supabase: ReturnType<typeof createSupabaseBrowserClient>) {
  const schedules: PublishedSchedule[] = [];

  for (let from = 0; ; from += schedulePageSize) {
    const result = await supabase
      .from("published_schedules")
      .select("*")
      .order("weekday", { ascending: true })
      .order("period", { ascending: true })
      .order("doctor_name", { ascending: true })
      .order("schedule_key", { ascending: true })
      .range(from, from + schedulePageSize - 1);

    if (result.error) {
      console.error(result.error);
      break;
    }

    const rows = (result.data ?? []) as PublishedSchedule[];
    schedules.push(...rows);

    if (rows.length < schedulePageSize) {
      break;
    }
  }

  return schedules;
}

async function loadPageData(): Promise<PageData> {
  const supabase = createSupabaseBrowserClient();

  const [hospitalResult, schedules] = await Promise.all([
    supabase
      .from("hospitals")
      .select("id,region,hospital_name,branch_name,schedule_url,enabled")
      .eq("enabled", true)
      .order("region", { ascending: true }),
    loadPublishedSchedules(supabase)
  ]);

  if (hospitalResult.error) {
    console.error(hospitalResult.error);
  }

  return {
    hospitals: hospitalResult.data ?? [],
    schedules
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const data = await loadPageData();

  return (
    <ClientDashboard
      hospitals={data.hospitals}
      schedules={data.schedules}
      initialFilters={{
        q: params.q ?? "",
        department: params.department ?? "",
        doctor: params.doctor ?? ""
      }}
    />
  );
}
