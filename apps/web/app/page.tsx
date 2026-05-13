import ClientDashboard from "./ClientDashboard";
import { createSupabaseBrowserClient } from "../lib/supabase";
import type { Hospital, PublishedSchedule } from "../lib/types";

type HomePageProps = {
  searchParams?: Promise<{
    q?: string;
    department?: string;
    weekday?: string;
  }>;
};

type PageData = {
  hospitals: Hospital[];
  schedules: PublishedSchedule[];
};

async function loadPageData(): Promise<PageData> {
  const supabase = createSupabaseBrowserClient();

  const [hospitalResult, scheduleResult] = await Promise.all([
    supabase
      .from("hospitals")
      .select("id,region,hospital_name,branch_name,schedule_url,enabled")
      .eq("enabled", true)
      .order("region", { ascending: true }),
    supabase
      .from("published_schedules")
      .select("*")
      .order("weekday", { ascending: true })
      .order("period", { ascending: true })
      .order("doctor_name", { ascending: true })
  ]);

  if (hospitalResult.error) {
    console.error(hospitalResult.error);
  }

  if (scheduleResult.error) {
    console.error(scheduleResult.error);
  }

  return {
    hospitals: hospitalResult.data ?? [],
    schedules: scheduleResult.data ?? []
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
        doctor: params.weekday ?? ""
      }}
    />
  );
}
