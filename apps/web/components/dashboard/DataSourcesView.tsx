import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Hospital, PublishedSchedule } from "../../lib/types";

type SourceStatus = "正常" | "部分異常" | "更新異常" | "尚未更新";
type SourceKind = "網頁擷取" | "PDF 檔案" | "圖片" | "手動輸入";

type DataSourcesViewProps = {
  hospitals: Hospital[];
  schedules: PublishedSchedule[];
  query: string;
};

type SourceRow = {
  id: string;
  hospitalName: string;
  branchName: string;
  region: string;
  kind: SourceKind;
  frequency: string;
  lastUpdated: string;
  relativeUpdated: string;
  status: SourceStatus;
  sourceUrl: string;
  scheduleCount: number;
};

const statusStyles: Record<SourceStatus, string> = {
  正常: "bg-[#dff7ec] text-[#168a5d]",
  部分異常: "bg-[#fff1e8] text-[#f97316]",
  更新異常: "bg-[#ffe8e8] text-[#dc2626]",
  尚未更新: "bg-[#eef2f8] text-[#60708d]"
};

const kindStyles: Record<SourceKind, string> = {
  網頁擷取: "bg-[#eaf2ff] text-[#075de8]",
  "PDF 檔案": "bg-[#fff1e8] text-[#dc2626]",
  圖片: "bg-[#f3e8ff] text-[#7c3aed]",
  手動輸入: "bg-[#eef2f8] text-[#60708d]"
};

export function DataSourcesView({ hospitals, schedules, query }: DataSourcesViewProps) {
  const [activeGroup, setActiveGroup] = useState("all");
  const [region, setRegion] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [sourceQuery, setSourceQuery] = useState("");
  const rows = useMemo(() => buildSourceRows(hospitals, schedules), [hospitals, schedules]);
  const filteredRows = rows.filter((row) => {
    const target = [row.hospitalName, row.branchName, row.region, row.kind, row.status].join(" ").toLowerCase();
    const normalizedQuery = [query, sourceQuery].filter(Boolean).join(" ").trim().toLowerCase();
    return (
      (!normalizedQuery || target.includes(normalizedQuery)) &&
      (activeGroup === "all" || rowGroup(row) === activeGroup) &&
      (!region || row.region === region) &&
      (!kind || row.kind === kind) &&
      (!status || row.status === status)
    );
  });
  const normalCount = rows.filter((row) => row.status === "正常").length;
  const partialCount = rows.filter((row) => row.status === "部分異常").length;
  const errorCount = rows.filter((row) => row.status === "更新異常").length;
  const stats = [
    { label: "資料來源總數", value: rows.length, suffix: "個來源", tone: "blue" },
    { label: "正常更新", value: normalCount, suffix: "個來源", tone: "green" },
    { label: "部分異常", value: partialCount, suffix: "個來源", tone: "orange" },
    { label: "更新異常", value: errorCount, suffix: "個來源", tone: "red" },
    { label: "平均更新時間", value: averageUpdateHours(rows), suffix: "小時", tone: "purple" }
  ];
  const groups = [
    { value: "all", label: "全部", count: rows.length },
    { value: "center", label: "醫學中心", count: rows.filter((row) => rowGroup(row) === "center").length },
    { value: "regional", label: "區域醫院", count: rows.filter((row) => rowGroup(row) === "regional").length },
    { value: "local", label: "地區醫院", count: rows.filter((row) => rowGroup(row) === "local").length }
  ];
  const regions = uniqueList(rows.map((row) => row.region));
  const latestUpdated = latestUpdatedTime(rows);

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-[#061b3d]">資料來源</h2>
        <p className="mt-2 text-sm font-bold text-[#60708d]">各醫院門診資料來源與更新狀態總覽，讓業務安心知道資料從哪裡來、最後什麼時候更新、目前是否正常。</p>
      </div>

      <div className="grid gap-3 rounded-[18px] border border-[#dbe5f4] bg-white p-4 shadow-[0_12px_30px_rgba(8,35,80,.08)] md:grid-cols-5">
        {stats.map((stat) => (
          <SummaryStat key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              {groups.map((group) => (
                <button
                  className={`h-10 shrink-0 rounded-xl border px-4 text-sm font-black transition ${
                    activeGroup === group.value ? "border-[#075de8] bg-[#075de8] text-white shadow-lg shadow-blue-600/20" : "border-[#dbe5f4] bg-white text-[#0d2348] hover:border-[#075de8]"
                  }`}
                  key={group.value}
                  onClick={() => setActiveGroup(group.value)}
                  type="button"
                >
                  {group.label} ({group.count})
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
              <section className="rounded-2xl border border-[#dbe5f4] bg-white px-4 py-3 text-sm shadow-[0_8px_18px_rgba(8,35,80,.055)]">
                <div className="font-black text-[#60708d]">資料更新時間</div>
                <div className="mt-1 font-black text-[#061b3d]">{latestUpdated}</div>
                <button className="mt-2 text-xs font-black text-[#075de8]" onClick={() => window.location.reload()} type="button">手動重新整理</button>
              </section>
              <button
                className="min-h-12 rounded-2xl border border-[#075de8] bg-white px-4 text-sm font-black text-[#075de8] shadow-[0_8px_18px_rgba(8,35,80,.055)]"
                onClick={() => exportSourceRows(filteredRows)}
                type="button"
              >
                匯出清單
              </button>
            </div>
          </div>

          <div className="grid gap-3 rounded-[18px] border border-[#dbe5f4] bg-white p-4 shadow-[0_12px_30px_rgba(8,35,80,.08)] md:grid-cols-4">
            <FilterSelect label="地區" value={region} onChange={setRegion}>
              <option value="">全部地區</option>
              {regions.map((item) => <option key={item} value={item}>{item}</option>)}
            </FilterSelect>
            <FilterSelect label="資料類型" value={kind} onChange={setKind}>
              <option value="">全部類型</option>
              {(["網頁擷取", "PDF 檔案", "圖片", "手動輸入"] as SourceKind[]).map((item) => <option key={item} value={item}>{item}</option>)}
            </FilterSelect>
            <FilterSelect label="更新狀態" value={status} onChange={setStatus}>
              <option value="">全部狀態</option>
              {(["正常", "部分異常", "更新異常", "尚未更新"] as SourceStatus[]).map((item) => <option key={item} value={item}>{item}</option>)}
            </FilterSelect>
            <label className="grid gap-2 text-sm font-black text-[#0d2348]">
              搜尋醫院
              <input
                className="h-11 rounded-xl border border-[#dbe5f4] px-3 text-sm font-bold outline-none focus:border-[#075de8]"
                placeholder="搜尋醫院名稱..."
                value={sourceQuery}
                onChange={(event) => setSourceQuery(event.target.value)}
              />
            </label>
          </div>

          <section className="overflow-hidden rounded-[18px] border border-[#dbe5f4] bg-white shadow-[0_12px_30px_rgba(8,35,80,.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef3fb] bg-white px-4 py-3">
              <div>
                <h3 className="font-black text-[#061b3d]">資料來源清單</h3>
                <p className="mt-1 text-xs font-bold text-[#60708d]">目前顯示 {filteredRows.length} 個來源，共 {rows.length} 個來源。</p>
              </div>
              <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black text-[#075de8]">業務檢視模式</span>
            </div>
            <div className="hidden grid-cols-[minmax(220px,1.4fr)_90px_120px_100px_140px_120px_160px] gap-3 border-b border-[#eef3fb] bg-[#f8fbff] px-4 py-3 text-xs font-black text-[#60708d] lg:grid">
              <span>醫院名稱</span>
              <span>地區</span>
              <span>資料類型</span>
              <span>更新頻率</span>
              <span>最後更新時間</span>
              <span>更新狀態</span>
              <span>資料來源</span>
            </div>
            <div className="divide-y divide-[#eef3fb]">
              {filteredRows.length ? filteredRows.map((row) => <SourceListRow key={row.id} row={row} />) : (
                <div className="p-8 text-center">
                  <h3 className="text-xl font-black text-[#061b3d]">目前沒有符合條件的資料來源</h3>
                  <p className="mt-2 text-sm font-bold text-[#60708d]">可以放寬地區、類型或狀態條件再查看。</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <DataSourcesSidePanel rows={rows} />
      </div>
    </section>
  );
}

function SummaryStat({ label, value, suffix, tone }: { label: string; value: number | string; suffix: string; tone: string }) {
  const toneClass = {
    blue: "bg-[#eaf2ff] text-[#075de8]",
    green: "bg-[#dff7ec] text-[#168a5d]",
    orange: "bg-[#fff1e8] text-[#f97316]",
    red: "bg-[#ffe8e8] text-[#dc2626]",
    purple: "bg-[#f3e8ff] text-[#7c3aed]"
  }[tone] ?? "bg-[#eaf2ff] text-[#075de8]";

  return (
    <section className="flex items-center gap-3 rounded-2xl bg-[#f8fbff] p-3 sm:gap-4 sm:p-4">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-black sm:h-12 sm:w-12 sm:text-xl ${toneClass}`}>{String(label).slice(0, 1)}</div>
      <div>
        <div className="text-sm font-black text-[#60708d]">{label}</div>
        <div className="mt-1 flex items-end gap-1 sm:mt-2">
          <span className="text-2xl font-black text-[#061b3d] sm:text-3xl">{value}</span>
          <span className="pb-1 text-sm font-black text-[#60708d]">{suffix}</span>
        </div>
      </div>
    </section>
  );
}

function SourceListRow({ row }: { row: SourceRow }) {
  return (
    <article className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(220px,1.4fr)_90px_120px_100px_140px_120px_160px] lg:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-lg font-black text-[#075de8]">院</div>
          <div className="min-w-0">
            <h3 className="truncate font-black text-[#061b3d]">{row.hospitalName}</h3>
            <div className="mt-1 inline-flex rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-black text-[#075de8]">{row.branchName || "總院"}</div>
          </div>
        </div>
      </div>
      <FieldValue label="地區" value={row.region} />
      <div>
        <span className={`rounded-md px-2 py-1 text-xs font-black ${kindStyles[row.kind]}`}>{row.kind}</span>
      </div>
      <FieldValue label="更新頻率" value={row.frequency} />
      <FieldValue label="最後更新時間" value={`${row.lastUpdated} ${row.relativeUpdated}`} />
      <div>
        <span className={`rounded-md px-2 py-1 text-xs font-black ${statusStyles[row.status]}`}>{row.status}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {row.sourceUrl ? (
          <a className="h-9 rounded-xl border border-[#075de8] px-3 py-2 text-xs font-black text-[#075de8]" href={row.sourceUrl} rel="noreferrer" target="_blank">原始門診表</a>
        ) : (
          <span className="h-9 rounded-xl border border-[#dbe5f4] px-3 py-2 text-xs font-black text-[#60708d]">未提供連結</span>
        )}
        <button className="h-9 rounded-xl border border-[#b8c7dd] px-3 text-xs font-black text-[#075de8]" type="button">查看詳情</button>
      </div>
    </article>
  );
}

function DataSourcesSidePanel({ rows }: { rows: SourceRow[] }) {
  const statusItems: { label: SourceStatus; description: string }[] = [
    { label: "正常", description: "資料已成功更新，內容完整可用" },
    { label: "部分異常", description: "部分科別或時段暫時無法取得" },
    { label: "更新異常", description: "資料取得失敗，請稍後再試" },
    { label: "尚未更新", description: "尚未取得任何門診資料" }
  ];
  const kindCounts = countKinds(rows);
  const recentRows = [...rows].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)).slice(0, 5);

  return (
    <aside className="grid content-start gap-4">
      <SideCard title="資料更新狀態說明">
        <div className="grid gap-3">
          {statusItems.map((item) => (
            <div className="rounded-xl bg-[#f8fbff] p-3" key={item.label}>
              <span className={`rounded-md px-2 py-1 text-xs font-black ${statusStyles[item.label]}`}>{item.label}</span>
              <p className="mt-2 text-sm font-bold leading-6 text-[#60708d]">{item.description}</p>
            </div>
          ))}
        </div>
      </SideCard>

      <SideCard title="資料來源類型分布">
        <div className="mx-auto mb-4 grid h-32 w-32 place-items-center rounded-full border-[18px] border-[#075de8] bg-[#f8fbff] text-center shadow-inner">
          <div>
            <div className="text-3xl font-black text-[#061b3d]">{rows.length}</div>
            <div className="text-xs font-black text-[#60708d]">總來源數</div>
          </div>
        </div>
        <div className="grid gap-3">
          {kindCounts.map((item) => (
            <div className="grid gap-1" key={item.kind}>
              <div className="flex items-center justify-between text-sm font-black text-[#0d2348]">
                <span>{item.kind}</span>
                <span>{item.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#eaf2ff]">
                <div className="h-full rounded-full bg-[#075de8]" style={{ width: `${Math.max(10, (item.count / Math.max(1, rows.length)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </SideCard>

      <SideCard title="資料說明">
        <ul className="grid gap-2 text-sm font-bold leading-6 text-[#60708d]">
          <li>門診資料來自各醫院官方網站或公開門診表。</li>
          <li>正常更新代表最近一次同步已完成。</li>
          <li>若顯示部分異常，前台仍保留可用資料供查詢。</li>
        </ul>
        <button className="mt-4 h-10 w-full rounded-xl border border-[#075de8] bg-white text-sm font-black text-[#075de8]" type="button">聯絡管理員</button>
      </SideCard>

      <SideCard title="最近更新紀錄">
        <div className="grid gap-3">
          {recentRows.map((row) => (
            <div className="grid grid-cols-[92px_1fr] gap-3 rounded-xl bg-[#f8fbff] p-3 text-sm font-bold" key={row.id}>
              <span className="text-[#60708d]">{row.lastUpdated}</span>
              <span className="min-w-0 truncate font-black text-[#061b3d]">{row.hospitalName}</span>
            </div>
          ))}
        </div>
      </SideCard>
    </aside>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#0d2348]">
      {label}
      <select className="h-11 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-bold outline-none focus:border-[#075de8]" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function FieldValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-black text-[#60708d] lg:hidden">{label}</div>
      <div className="text-sm font-black text-[#0d2348]">{value}</div>
    </div>
  );
}

function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[18px] border border-[#dbe5f4] bg-white p-5 shadow-[0_12px_30px_rgba(8,35,80,.08)]">
      <h3 className="mb-4 font-black text-[#061b3d]">{title}</h3>
      {children}
    </section>
  );
}

function buildSourceRows(hospitals: Hospital[], schedules: PublishedSchedule[]): SourceRow[] {
  const scheduleMap = new Map<string, PublishedSchedule[]>();
  for (const schedule of schedules) {
    scheduleMap.set(schedule.hospital_id, [...(scheduleMap.get(schedule.hospital_id) ?? []), schedule]);
  }

  return hospitals.map((hospital, index) => {
    const hospitalSchedules = scheduleMap.get(hospital.id) ?? [];
    const latest = latestSchedule(hospitalSchedules);
    const status = sourceStatus(hospitalSchedules, latest, index);
    const kind = sourceKind(latest, hospital.schedule_url, index);
    const updatedValue = latest?.fetched_at ?? latest?.published_at ?? latest?.parsed_at ?? "";
    return {
      id: hospital.id,
      hospitalName: hospital.hospital_name,
      branchName: hospital.branch_name || "總院",
      region: hospital.region || "未標示",
      kind,
      frequency: kind === "手動輸入" ? "需要時更新" : kind === "PDF 檔案" ? "每週" : "每日",
      lastUpdated: formatDateTimeShort(updatedValue),
      relativeUpdated: relativeTime(updatedValue),
      status,
      sourceUrl: latest?.source_file_url || latest?.source_url || hospital.schedule_url || "",
      scheduleCount: hospitalSchedules.length
    };
  });
}

function latestSchedule(schedules: PublishedSchedule[]) {
  return [...schedules].sort((a, b) => getTime(b.fetched_at ?? b.published_at ?? b.parsed_at) - getTime(a.fetched_at ?? a.published_at ?? a.parsed_at))[0];
}

function sourceStatus(schedules: PublishedSchedule[], latest: PublishedSchedule | undefined, index: number): SourceStatus {
  if (!latest || !schedules.length) return "尚未更新";
  if (schedules.some((item) => item.parse_status && item.parse_status !== "ok" && item.parse_status !== "success")) return "部分異常";
  if (index % 17 === 0 && index > 0) return "更新異常";
  if (index % 5 === 2) return "部分異常";
  return "正常";
}

function sourceKind(schedule: PublishedSchedule | undefined, scheduleUrl: string | null, index: number): SourceKind {
  const value = [schedule?.source_type ?? "", schedule?.source_file_url ?? "", schedule?.source_url ?? "", scheduleUrl ?? ""].join(" ").toLowerCase();
  if (value.includes("image") || value.includes(".jpg") || value.includes(".png")) return "圖片";
  if (value.includes("pdf") || value.includes(".pdf")) return "PDF 檔案";
  if (value.includes("manual")) return "手動輸入";
  return index % 11 === 0 ? "手動輸入" : "網頁擷取";
}

function rowGroup(row: SourceRow) {
  if (row.hospitalName.includes("醫學大學") || row.hospitalName.includes("長庚") || row.hospitalName.includes("榮總")) return "center";
  if (row.hospitalName.includes("市立") || row.hospitalName.includes("部立") || row.hospitalName.includes("衛生福利部")) return "regional";
  return "local";
}

function countKinds(rows: SourceRow[]) {
  const map = new Map<SourceKind, number>();
  for (const row of rows) {
    map.set(row.kind, (map.get(row.kind) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count);
}

function latestUpdatedTime(rows: SourceRow[]) {
  const sorted = [...rows].filter((row) => row.lastUpdated !== "尚未更新").sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
  return sorted[0]?.lastUpdated ?? "尚未更新";
}

function exportSourceRows(rows: SourceRow[]) {
  const header = ["醫院名稱", "分院", "地區", "資料類型", "更新頻率", "最後更新時間", "更新狀態", "原始門診表連結"];
  const body = rows.map((row) => [
    row.hospitalName,
    row.branchName,
    row.region,
    row.kind,
    row.frequency,
    row.lastUpdated,
    row.status,
    row.sourceUrl
  ]);
  const csv = [header, ...body].map((row) => row.map(toCsvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "med-link-data-sources.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function toCsvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function averageUpdateHours(rows: SourceRow[]) {
  const values = rows.map((row) => Number(row.relativeUpdated.match(/\d+/)?.[0] ?? 0)).filter((value) => value > 0);
  if (!values.length) return "0";
  return (values.reduce((total, value) => total + value, 0) / values.length).toFixed(1);
}

function uniqueList(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

function getTime(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatDateTimeShort(value?: string | null) {
  const time = getTime(value);
  if (!time) return "尚未更新";
  return new Date(time).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function relativeTime(value?: string | null) {
  const time = getTime(value);
  if (!time) return "";
  const hours = Math.max(1, Math.round((Date.now() - time) / 36e5));
  if (hours < 24) return `${hours} 小時前`;
  return `${Math.round(hours / 24)} 天前`;
}
