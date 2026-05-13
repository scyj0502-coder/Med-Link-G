"use client";

import { useEffect, useMemo, useState } from "react";
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

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];
const favoriteStorageKey = "medlink:favorites:v2";

type ClientDashboardProps = {
  hospitals: Hospital[];
  schedules: PublishedSchedule[];
  initialFilters: {
    q: string;
    department: string;
    weekday: string;
  };
};

type CalendarDay = {
  date: Date;
  inMonth: boolean;
  count: number;
  preview: PublishedSchedule[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function monthTitle(date: Date) {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月看板`;
}

function favoriteKey(item: PublishedSchedule) {
  return [item.hospital_id, item.department, item.doctor_name].join("|");
}

function hospitalLabel(hospital: Hospital) {
  return `${hospital.hospital_name} ${hospital.branch_name}`;
}

function scheduleMatchesQuery(item: PublishedSchedule, query: string) {
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

function schedulesForDate(schedules: PublishedSchedule[], date: Date) {
  return schedules.filter((item) => item.weekday === date.getDay());
}

function buildCalendarDays(viewDate: Date, schedules: PublishedSchedule[]) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 42 }, (_, index): CalendarDay => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const items = schedulesForDate(schedules, date);
    return {
      date,
      inMonth: date.getMonth() === viewDate.getMonth(),
      count: items.length,
      preview: items.slice(0, 2)
    };
  });
}

function openMaps(item: PublishedSchedule) {
  const query = encodeURIComponent(`${item.hospital_name} ${item.branch_name}`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener");
}

export default function ClientDashboard({ hospitals, schedules, initialFilters }: ClientDashboardProps) {
  const [query, setQuery] = useState(initialFilters.q);
  const [region, setRegion] = useState("");
  const [hospital, setHospital] = useState("");
  const [department, setDepartment] = useState(initialFilters.department);
  const [weekday, setWeekday] = useState(initialFilters.weekday);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [favorites, setFavorites] = useState<string[]>([]);
  const [detailItem, setDetailItem] = useState<PublishedSchedule | null>(null);

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem(favoriteStorageKey) || "[]"));
    } catch {
      setFavorites([]);
    }
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(schedules.map((item) => item.department))).sort((a, b) => a.localeCompare(b, "zh-Hant")),
    [schedules]
  );

  const regions = useMemo(
    () => Array.from(new Set(hospitals.map((item) => item.region))).sort((a, b) => a.localeCompare(b, "zh-Hant")),
    [hospitals]
  );

  const hospitalOptions = useMemo(
    () =>
      hospitals
        .filter((item) => !region || item.region === region)
        .map((item) => ({
          id: item.id,
          label: hospitalLabel(item)
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "zh-Hant")),
    [hospitals, region]
  );

  const filteredSchedules = useMemo(
    () =>
      schedules.filter((item) => {
        const source = hospitals.find((entry) => entry.id === item.hospital_id);
        const regionOk = !region || source?.region === region;
        const hospitalOk = !hospital || item.hospital_id === hospital;
        const departmentOk = !department || item.department === department;
        const weekdayOk = !weekday || String(item.weekday) === weekday;
        return regionOk && hospitalOk && departmentOk && weekdayOk && scheduleMatchesQuery(item, query);
      }),
    [department, hospital, hospitals, query, region, schedules, weekday]
  );

  const monthSchedules = useMemo(() => {
    const days = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), index + 1);
      return schedulesForDate(filteredSchedules, date).length;
    }).reduce((sum, count) => sum + count, 0);
  }, [filteredSchedules, viewDate]);

  const todaySchedules = useMemo(() => schedulesForDate(filteredSchedules, new Date()), [filteredSchedules]);
  const selectedDateSchedules = useMemo(
    () => schedulesForDate(filteredSchedules, selectedDate),
    [filteredSchedules, selectedDate]
  );
  const calendarDays = useMemo(() => buildCalendarDays(viewDate, filteredSchedules), [filteredSchedules, viewDate]);
  const favoriteCount = useMemo(
    () => filteredSchedules.filter((item) => favorites.includes(favoriteKey(item))).length,
    [favorites, filteredSchedules]
  );

  function toggleFavorite(item: PublishedSchedule) {
    const key = favoriteKey(item);
    const next = favorites.includes(key)
      ? favorites.filter((value) => value !== key)
      : [...favorites, key];
    setFavorites(next);
    localStorage.setItem(favoriteStorageKey, JSON.stringify(next));
  }

  function moveMonth(delta: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function resetFilters() {
    setQuery("");
    setRegion("");
    setHospital("");
    setDepartment("");
    setWeekday("");
  }

  function updateRegion(nextRegion: string) {
    setRegion(nextRegion);
    setHospital("");
  }

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[340px_1fr] lg:px-8">
        <aside className="rounded-lg bg-[#0d3535] p-5 text-white shadow-sm lg:sticky lg:top-6 lg:self-start">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#ffb703] font-black text-ink">M</div>
            <div>
              <p className="text-xs font-bold uppercase opacity-70">Med-Link</p>
              <h1 className="text-2xl font-black">醫點通</h1>
            </div>
          </div>

          <section className="rounded-lg border border-white/15 bg-white/10 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">智慧查詢</h2>
              <button className="rounded-lg bg-white/15 px-3 py-2 text-sm font-bold" onClick={resetFilters} type="button">
                重設
              </button>
            </div>
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-white/80">
                快速搜尋醫師
                <input
                  className="h-12 rounded-lg border border-transparent bg-white px-4 text-base text-ink outline-none focus:border-[#ffb703]"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="輸入姓名、科別、診間或醫院"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-white/80">
                地區
                <select
                  className="h-12 rounded-lg border border-transparent bg-white px-4 text-base text-ink outline-none focus:border-[#ffb703]"
                  value={region}
                  onChange={(event) => updateRegion(event.target.value)}
                >
                  <option value="">全部地區</option>
                  {regions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-white/80">
                醫院與分院
                <select
                  className="h-12 rounded-lg border border-transparent bg-white px-4 text-base text-ink outline-none focus:border-[#ffb703]"
                  value={hospital}
                  onChange={(event) => setHospital(event.target.value)}
                >
                  <option value="">全部醫院</option>
                  {hospitalOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-white/80">
                科別
                <select
                  className="h-12 rounded-lg border border-transparent bg-white px-4 text-base text-ink outline-none focus:border-[#ffb703]"
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                >
                  <option value="">全部科別</option>
                  {departments.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-white/80">
                星期
                <select
                  className="h-12 rounded-lg border border-transparent bg-white px-4 text-base text-ink outline-none focus:border-[#ffb703]"
                  value={weekday}
                  onChange={(event) => setWeekday(event.target.value)}
                >
                  {weekdayOptions.map((item) => (
                    <option key={item.value || "all"} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="rounded-lg bg-white/10 p-3 text-sm leading-6 text-white/75">
                目前篩選 {filteredSchedules.length} 筆診次。收藏與詳細資料只保存在你的裝置，不會寫回資料庫。
              </p>
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-white/15 bg-white/10 p-4">
            <h2 className="text-xl font-black">資料來源</h2>
            <div className="mt-3 grid gap-3">
              {hospitals.map((hospital) => (
                <article key={hospital.id} className="rounded-lg bg-white/10 p-3">
                  <p className="text-xs font-bold text-[#ffdf7e]">{hospital.region}</p>
                  <h3 className="mt-1 font-black">{hospitalLabel(hospital)}</h3>
                  {hospital.schedule_url ? (
                    <a className="mt-2 inline-block text-sm font-bold text-[#a7f3d0]" href={hospital.schedule_url}>
                      原始門診連結
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </aside>

        <section className="min-w-0">
          <header className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand">南台灣醫療通路診表整合</p>
              <h2 className="mt-2 text-4xl font-black text-ink">今日門診動態</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                新版已接上 Supabase，並補回收藏、詳細資料、導航與月曆看板。
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Supabase 已連線
            </div>
          </header>

          <section className="mb-5 grid gap-4 md:grid-cols-4">
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-sm font-semibold text-slate-500">本月診次</span>
              <strong className="mt-2 block text-3xl text-ink">{monthSchedules}</strong>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-sm font-semibold text-slate-500">今日開診</span>
              <strong className="mt-2 block text-3xl text-ink">{todaySchedules.length}</strong>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-sm font-semibold text-slate-500">收藏追蹤</span>
              <strong className="mt-2 block text-3xl text-ink">{favoriteCount}</strong>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-sm font-semibold text-slate-500">已發布診次</span>
              <strong className="mt-2 block text-3xl text-ink">{schedules.length}</strong>
            </article>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.75fr)]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase text-slate-500">Calendar</p>
                  <h2 className="mt-1 text-2xl font-black text-ink">{monthTitle(viewDate)}</h2>
                </div>
                <div className="flex gap-2">
                  <button className="grid h-11 w-11 place-items-center rounded-lg bg-slate-100 text-xl font-black text-brand" onClick={() => moveMonth(-1)} type="button">
                    ‹
                  </button>
                  <button className="grid h-11 w-11 place-items-center rounded-lg bg-slate-100 text-xl font-black text-brand" onClick={() => moveMonth(1)} type="button">
                    ›
                  </button>
                </div>
              </div>
              <div className="mb-2 grid grid-cols-7 gap-2 text-center text-sm font-black text-slate-500">
                {weekdayLabels.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const selected = dateKey(day.date) === dateKey(selectedDate);
                  return (
                    <button
                      className={[
                        "min-h-24 rounded-lg border p-2 text-left transition",
                        day.inMonth ? "bg-white" : "bg-slate-50 opacity-45",
                        selected ? "border-brand ring-2 ring-brand" : "border-slate-200",
                        day.count ? "hover:border-brand" : ""
                      ].join(" ")}
                      key={dateKey(day.date)}
                      onClick={() => setSelectedDate(day.date)}
                      type="button"
                    >
                      <span className="flex items-center justify-between font-black text-ink">
                        {day.date.getDate()}
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-brand">{day.count}</span>
                      </span>
                      <span className="mt-2 hidden gap-1 text-xs text-slate-500 sm:grid">
                        {day.preview.map((item) => (
                          <span className="truncate" key={`${dateKey(day.date)}-${item.schedule_key}`}>
                            {item.period} {item.doctor_name}
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <p className="text-sm font-semibold uppercase text-slate-500">Schedule</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-black text-ink">
                    {selectedDate.getMonth() + 1}/{selectedDate.getDate()} 診次
                  </h2>
                  <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700" onClick={() => setSelectedDate(new Date())} type="button">
                    今天
                  </button>
                </div>
              </div>
              <div className="grid max-h-[720px] gap-3 overflow-auto p-5">
                {selectedDateSchedules.length ? (
                  selectedDateSchedules.map((item) => {
                    const favorited = favorites.includes(favoriteKey(item));
                    return (
                      <article className="rounded-lg border border-slate-200 border-l-4 border-l-brand bg-white p-4" key={item.schedule_key}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-black text-ink">
                              {item.doctor_name} · {item.department}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">
                              {item.hospital_name} {item.branch_name}
                            </p>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                            正常開診
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">
                          {item.weekday_label}｜{item.period}｜診間 {item.room || "未標示"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            className={`rounded-lg border px-3 py-2 text-sm font-black ${favorited ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-300 text-brand"}`}
                            onClick={() => toggleFavorite(item)}
                            type="button"
                          >
                            {favorited ? "已收藏" : "收藏"}
                          </button>
                          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-black text-brand" onClick={() => setDetailItem(item)} type="button">
                            詳細資料
                          </button>
                          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-black text-brand" onClick={() => openMaps(item)} type="button">
                            導航
                          </button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    目前條件在此日期沒有門診資料。
                  </p>
                )}
              </div>
            </aside>
          </section>
        </section>
      </div>

      {detailItem ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0d3535]/50 p-4">
          <section className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-sm font-bold text-brand">
                  {detailItem.hospital_name} {detailItem.branch_name}
                </p>
                <h2 className="mt-1 text-2xl font-black text-ink">
                  {detailItem.doctor_name} · {detailItem.department}
                </h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 font-black text-slate-700" onClick={() => setDetailItem(null)} type="button">
                x
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="日期班別" value={`${detailItem.weekday_label} ${detailItem.period}`} />
              <DetailField label="診間" value={detailItem.room || "未標示"} />
              <DetailField label="標準科別" value={detailItem.department} />
              <DetailField label="追蹤狀態" value={favorites.includes(favoriteKey(detailItem)) ? "已收藏，未來可優先推播" : "尚未收藏"} />
              <DetailField label="資料發布時間" value={new Date(detailItem.published_at).toLocaleString("zh-TW")} />
              <DetailField label="資料來源" value={detailItem.source_url ? "可開啟來源" : "未標示"} href={detailItem.source_url ?? undefined} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-lg bg-brand px-4 py-3 font-black text-white" onClick={() => toggleFavorite(detailItem)} type="button">
                {favorites.includes(favoriteKey(detailItem)) ? "取消收藏" : "加入收藏"}
              </button>
              <button className="rounded-lg border border-slate-300 px-4 py-3 font-black text-brand" onClick={() => openMaps(detailItem)} type="button">
                導航至醫院
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function DetailField({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      {href ? (
        <a className="mt-1 block font-black text-brand hover:underline" href={href}>
          {value}
        </a>
      ) : (
        <strong className="mt-1 block text-ink">{value}</strong>
      )}
    </div>
  );
}
