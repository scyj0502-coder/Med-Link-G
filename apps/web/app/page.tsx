import { createSupabaseBrowserClient } from "../lib/supabase";
import type { PublishedSchedule } from "../lib/types";

async function loadSchedules(): Promise<PublishedSchedule[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("published_schedules")
    .select("*")
    .order("weekday", { ascending: true })
    .order("period", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

export default async function HomePage() {
  const schedules = await loadSchedules();

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-semibold text-slate-500">南台灣醫療通路診表整合</p>
        <h1 className="text-4xl font-black tracking-normal">醫點通</h1>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-sm font-semibold text-slate-500">已發布診次</span>
          <strong className="mt-2 block text-3xl">{schedules.length}</strong>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-sm font-semibold text-slate-500">資料來源</span>
          <strong className="mt-2 block text-3xl">岡山醫院</strong>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-sm font-semibold text-slate-500">已確認異動</span>
          <strong className="mt-2 block text-3xl text-red-700">0</strong>
        </article>
      </section>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-black">已發布門診</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {schedules.length ? (
            schedules.map((item) => (
              <article key={item.id} className="grid gap-1 px-5 py-4 md:grid-cols-[1fr_auto]">
                <div>
                  <h3 className="font-black">{item.doctor_name} · {item.department}</h3>
                  <p className="text-sm text-slate-600">{item.hospital_name} {item.branch_name}</p>
                </div>
                <p className="font-semibold">星期{item.weekday_label} · {item.period} · {item.room || "未標示"}</p>
              </article>
            ))
          ) : (
            <p className="px-5 py-8 text-slate-500">尚未發布診次。完成 Supabase 設定並執行爬蟲後會顯示資料。</p>
          )}
        </div>
      </section>
    </main>
  );
}

