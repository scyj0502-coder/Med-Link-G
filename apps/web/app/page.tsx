import { createSupabaseBrowserClient } from "../lib/supabase";
import type { Hospital, PublishedSchedule } from "../lib/types";

const weekdayOptions = [
  { value: "", label: "全部" },
  { value: "1", label: "一" },
  { value: "2", label: "二" },
  { value: "3", label: "三" },
  { value: "4", label: "四" },
  { value: "5", label: "五" },
  { value: "6", label: "六" },
  { value: "0", label: "日" }
];

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

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesQuery(item: PublishedSchedule, query: string) {
  if (!query) return true;
  const target = normalize([
    item.doctor_name,
    item.department,
    item.hospital_name,
    item.branch_name,
    item.weekday_label,
    item.period,
    item.room ?? ""
  ].join(" "));
  return target.includes(normalize(query));
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const selectedDepartment = params.department ?? "";
  const selectedWeekday = params.weekday ?? "";
  const query = params.q ?? "";
  const { hospitals, schedules } = await loadPageData();

  const departments = Array.from(new Set(schedules.map((item) => item.department))).sort((a, b) =>
    a.localeCompare(b, "zh-Hant")
  );

  const filteredSchedules = schedules.filter((item) => {
    const departmentOk = !selectedDepartment || item.department === selectedDepartment;
    const weekdayOk = !selectedWeekday || String(item.weekday) === selectedWeekday;
    return departmentOk && weekdayOk && matchesQuery(item, query);
  });

  const doctors = new Set(filteredSchedules.map((item) => item.doctor_name));
  const today = new Date().getDay();
  const todaySchedules = schedules.filter((item) => item.weekday === today);

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand">南台灣醫療通路診表整合</p>
            <h1 className="mt-2 text-4xl font-black tracking-normal text-ink">今日門診動態</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              目前已接上 Supabase，顯示系統發布後的可信門診資料。資料維護與異常處理留在後台流程，不進入業務查詢畫面。
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Supabase 已連線
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-sm font-semibold text-slate-500">已發布診次</span>
            <strong className="mt-2 block text-3xl text-ink">{schedules.length}</strong>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-sm font-semibold text-slate-500">目前篩選</span>
            <strong className="mt-2 block text-3xl text-ink">{filteredSchedules.length}</strong>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-sm font-semibold text-slate-500">醫師數</span>
            <strong className="mt-2 block text-3xl text-ink">{doctors.size}</strong>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-sm font-semibold text-slate-500">今日開診</span>
            <strong className="mt-2 block text-3xl text-ink">{todaySchedules.length}</strong>
          </article>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[1fr_220px_220px_auto]" action="/">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-600">快速搜尋</span>
              <input
                className="h-12 rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="q"
                defaultValue={query}
                placeholder="醫師、科別、醫院、診間"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-600">科別</span>
              <select
                className="h-12 rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="department"
                defaultValue={selectedDepartment}
              >
                <option value="">全部科別</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-600">星期</span>
              <select
                className="h-12 rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="weekday"
                defaultValue={selectedWeekday}
              >
                {weekdayOptions.map((item) => (
                  <option key={item.value || "all"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-3">
              <button className="h-12 rounded-lg bg-brand px-6 text-base font-black text-white shadow-sm hover:bg-teal-700">
                套用查詢
              </button>
              <a className="grid h-12 place-items-center rounded-lg border border-slate-300 px-5 font-bold text-slate-700" href="/">
                重設
              </a>
            </div>
          </form>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-ink">資料來源</h2>
            <div className="mt-4 grid gap-3">
              {hospitals.map((hospital) => (
                <article key={hospital.id} className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-brand">{hospital.region}</p>
                  <h3 className="mt-1 font-black text-ink">
                    {hospital.hospital_name} {hospital.branch_name}
                  </h3>
                  {hospital.schedule_url ? (
                    <a className="mt-3 inline-block text-sm font-bold text-brand hover:underline" href={hospital.schedule_url}>
                      原始門診連結
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </aside>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-sm font-semibold uppercase text-slate-500">Schedule</p>
              <h2 className="mt-1 text-2xl font-black text-ink">門診清單</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredSchedules.length ? (
                filteredSchedules.map((item) => (
                  <article key={item.schedule_key} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]">
                    <div>
                      <h3 className="text-lg font-black text-ink">
                        {item.doctor_name} · {item.department}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.hospital_name} {item.branch_name}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                        {item.weekday_label}
                      </span>
                      <span className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800">
                        {item.period}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                        {item.room || "未標示診間"}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="px-5 py-10 text-center text-slate-500">目前條件沒有門診資料，請調整搜尋或篩選條件。</p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
