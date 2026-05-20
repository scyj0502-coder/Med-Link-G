import ClientDashboard from "./ClientDashboard";
import { createSupabaseBrowserClient } from "../lib/supabase";
import { mergeSourceCatalog } from "../lib/sourceCatalog";
import type { Hospital, PublishedSchedule, SyncRun } from "../lib/types";

type HomePageProps = {
  searchParams?: Promise<{
    q?: string;
    region?: string;
    hospital?: string;
    branch?: string;
    department?: string;
    doctor?: string;
    weekday?: string;
    period?: string;
    favoritesOnly?: string;
    view?: string;
  }>;
};

type PageData = {
  hospitals: Hospital[];
  sourceHospitals: Hospital[];
  schedules: PublishedSchedule[];
  syncRuns: SyncRun[];
  syncRunStatusAvailable: boolean;
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

async function loadSyncRuns(supabase: ReturnType<typeof createSupabaseBrowserClient>) {
  const result = await supabase
    .from("sync_runs")
    .select("id,hospital_id,status,scraped_count,published_count,rejected_count,started_at,finished_at,error_message")
    .order("started_at", { ascending: false })
    .limit(250);

  if (result.error) {
    const fallbackResult = await supabase
      .from("sync_runs")
      .select("id,hospital_id,status,scraped_count,published_count,rejected_count,started_at,finished_at")
      .order("started_at", { ascending: false })
      .limit(250);

    if (fallbackResult.error) {
      console.error(fallbackResult.error);
      return { rows: [], available: false };
    }

    return { rows: (fallbackResult.data ?? []) as SyncRun[], available: true };
  }

  return { rows: (result.data ?? []) as SyncRun[], available: true };
}

async function loadPageData(): Promise<PageData> {
  const supabase = createSupabaseBrowserClient();

  const [hospitalResult, schedules, syncRunResult] = await Promise.all([
    supabase
      .from("hospitals")
      .select("id,region,hospital_name,branch_name,schedule_url,enabled")
      .eq("enabled", true)
      .order("region", { ascending: true }),
    loadPublishedSchedules(supabase),
    loadSyncRuns(supabase)
  ]);

  if (hospitalResult.error) {
    console.error(hospitalResult.error);
  }

  return {
    hospitals: hospitalResult.data ?? [],
    sourceHospitals: mergeSourceCatalog(hospitalResult.data ?? []),
    schedules,
    syncRuns: syncRunResult.rows,
    syncRunStatusAvailable: syncRunResult.available
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const data = await loadPageData();

  return (
    <ClientDashboard
      hospitals={data.hospitals}
      sourceHospitals={data.sourceHospitals}
      schedules={data.schedules}
      syncRuns={data.syncRuns}
      syncRunStatusAvailable={data.syncRunStatusAvailable}
      initialFilters={{
        q: params.q ?? "",
        region: params.region ?? "",
        hospital: params.hospital ?? "",
        branch: params.branch ?? "",
        department: params.department ?? "",
        doctor: params.doctor ?? "",
        weekday: params.weekday ?? "",
        period: params.period ?? "",
        favoritesOnly: params.favoritesOnly ?? ""
      }}
      initialView={["search", "favorites", "notes", "visits", "reminders", "sources", "account"].includes(params.view ?? "") ? (params.view as "search" | "favorites" | "notes" | "visits" | "reminders" | "sources" | "account") : "today"}
    />
  );
}
