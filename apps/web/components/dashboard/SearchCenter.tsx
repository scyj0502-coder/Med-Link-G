import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Hospital } from "../../lib/types";
import type { DoctorSchedule, FilterState, PersonalNote } from "../../lib/dashboard";
import { doctorKey, filterChips, periodOptions, uniqueSorted, weekdayOptions } from "../../lib/dashboard";
import { UiIcon } from "./UiIcon";

type SearchTab = "all" | "doctor" | "hospital" | "department" | "room" | "note" | "favorite";

type SearchResult =
  | {
      id: string;
      type: "doctor";
      item: DoctorSchedule;
      note?: PersonalNote;
      favorite: boolean;
    }
  | {
      id: string;
      type: "hospital";
      hospital: Hospital;
      count: number;
      departments: string[];
    }
  | {
      id: string;
      type: "department";
      department: string;
      count: number;
      hospitals: string[];
      sample?: DoctorSchedule;
    }
  | {
      id: string;
      type: "room";
      room: string;
      count: number;
      hospitals: string[];
      departments: string[];
      sample?: DoctorSchedule;
    }
  | {
      id: string;
      type: "note";
      note: PersonalNote;
      item?: DoctorSchedule;
      favorite: boolean;
    };

type SearchCenterProps = {
  hospitals: Hospital[];
  items: DoctorSchedule[];
  notes: PersonalNote[];
  favorites: string[];
  filters: FilterState;
  regions: string[];
  branches: string[];
  departments: string[];
  doctors: string[];
  query: string;
  onQueryChange: (value: string) => void;
  onOpenSchedule: (item: DoctorSchedule) => void;
  onFilterChange: (patch: Partial<FilterState>) => void;
  onApplyFilters: (patch: Partial<FilterState>) => void;
  onClearFilters: () => void;
  onToggleFavorite: (item: DoctorSchedule) => void;
};

const tabs: { value: SearchTab; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "doctor", label: "醫師" },
  { value: "hospital", label: "醫院" },
  { value: "department", label: "科別" },
  { value: "room", label: "診間" },
  { value: "note", label: "我的備註" },
  { value: "favorite", label: "收藏" }
];

const recentFallback = ["心臟內科 王照元", "診間 0107", "高雄醫學大學附設醫院", "下午診", "備註 熟飲"];

export function SearchCenter({
  hospitals,
  items,
  notes,
  favorites,
  filters,
  regions,
  branches,
  departments,
  doctors,
  query,
  onQueryChange,
  onOpenSchedule,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  onToggleFavorite
}: SearchCenterProps) {
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const noteMap = useMemo(() => new Map(notes.map((note) => [note.doctorKey, note])), [notes]);
  const normalizedQuery = normalize(query);
  const activeFilterChips = filterChips(filters, hospitals);

  const scopedItems = useMemo(() => {
    return items.filter((item) => matchesAdvancedFilters(item, filters, favorites));
  }, [favorites, filters, items]);

  const searchData = useMemo(() => {
    const doctorResults = scopedItems
      .filter((item) => {
        const key = doctorKey(item);
        const note = noteMap.get(key);
        return matchesQuery(
          [
            item.doctor_name,
            item.department,
            item.hospital_name,
            item.branch_name,
            item.region,
            item.weekday_label,
            item.displayPeriod,
            item.displayRoom,
            item.note ?? "",
            note?.content ?? "",
            note?.visitStatus ?? "",
            ...(note?.tags ?? [])
          ],
          normalizedQuery
        );
      })
      .slice(0, 80)
      .map<SearchResult>((item) => ({
        id: `doctor:${item.schedule_key}`,
        type: "doctor",
        item,
        note: noteMap.get(doctorKey(item)),
        favorite: favorites.includes(doctorKey(item))
      }));

    const hospitalResults = hospitals
      .map((hospital) => {
        const schedules = scopedItems.filter((item) => item.hospital_id === hospital.id);
        return {
          hospital,
          count: schedules.length,
          departments: uniqueSorted(schedules.map((item) => item.department)).slice(0, 5)
        };
      })
      .filter(({ hospital, count, departments }) =>
        count > 0 && matchesQuery([hospital.region, hospital.hospital_name, hospital.branch_name, hospital.schedule_url ?? "", ...departments], normalizedQuery)
      )
      .map<SearchResult>(({ hospital, count, departments }) => ({
        id: `hospital:${hospital.id}`,
        type: "hospital",
        hospital,
        count,
        departments
      }));

    const departmentMap = new Map<string, DoctorSchedule[]>();
    for (const item of scopedItems) {
      if (!departmentMap.has(item.department)) {
        departmentMap.set(item.department, []);
      }
      departmentMap.get(item.department)?.push(item);
    }
    const departmentResults = Array.from(departmentMap.entries())
      .filter(([department, schedules]) =>
        matchesQuery([department, ...schedules.flatMap((item) => [item.hospital_name, item.branch_name, item.doctor_name])], normalizedQuery)
      )
      .map<SearchResult>(([department, schedules]) => ({
        id: `department:${department}`,
        type: "department",
        department,
        count: schedules.length,
        hospitals: uniqueSorted(schedules.map((item) => item.hospital_name)).slice(0, 4),
        sample: schedules[0]
      }));

    const roomMap = new Map<string, DoctorSchedule[]>();
    for (const item of scopedItems) {
      if (!item.displayRoom || item.displayRoom.includes("未標示")) continue;
      if (!roomMap.has(item.displayRoom)) {
        roomMap.set(item.displayRoom, []);
      }
      roomMap.get(item.displayRoom)?.push(item);
    }
    const roomResults = Array.from(roomMap.entries())
      .filter(([room, schedules]) =>
        matchesQuery([room, ...schedules.flatMap((item) => [item.doctor_name, item.department, item.hospital_name, item.branch_name])], normalizedQuery)
      )
      .map<SearchResult>(([room, schedules]) => ({
        id: `room:${room}`,
        type: "room",
        room,
        count: schedules.length,
        hospitals: uniqueSorted(schedules.map((item) => item.hospital_name)).slice(0, 4),
        departments: uniqueSorted(schedules.map((item) => item.department)).slice(0, 5),
        sample: schedules[0]
      }));

    const noteResults = notes
      .map((note) => {
        const item = scopedItems.find((schedule) => doctorKey(schedule) === note.doctorKey);
        return { note, item };
      })
      .filter(({ note, item }) =>
        (!filters.favoritesOnly || (item ? favorites.includes(doctorKey(item)) : false)) &&
        matchesQuery(
          [
            note.content,
            note.visitStatus,
            note.lastVisitDate,
            note.nextReminder,
            ...note.tags,
            item?.doctor_name ?? "",
            item?.department ?? "",
            item?.hospital_name ?? ""
          ],
          normalizedQuery
        )
      )
      .map<SearchResult>(({ note, item }) => ({
        id: `note:${note.doctorKey}`,
        type: "note",
        note,
        item,
        favorite: item ? favorites.includes(doctorKey(item)) : false
      }));

    const favoriteResults = doctorResults.filter((result) => result.type === "doctor" && result.favorite);

    return {
      all: [...doctorResults, ...hospitalResults, ...departmentResults, ...roomResults, ...noteResults],
      doctor: doctorResults,
      hospital: hospitalResults,
      department: departmentResults,
      room: roomResults,
      note: noteResults,
      favorite: favoriteResults
    };
  }, [favorites, filters.favoritesOnly, hospitals, normalizedQuery, noteMap, notes, scopedItems]);

  const resultCounts = {
    all: searchData.all.length,
    doctor: searchData.doctor.length,
    hospital: searchData.hospital.length,
    department: searchData.department.length,
    room: searchData.room.length,
    note: searchData.note.length,
    favorite: searchData.favorite.length
  };
  const results = searchData[activeTab];
  const popular = useMemo(() => {
    const departments = uniqueSorted(scopedItems.map((item) => item.department)).slice(0, 5);
    const rooms = uniqueSorted(scopedItems.map((item) => item.displayRoom).filter((room) => !room.includes("未標示"))).slice(0, 4);
    const doctors = uniqueSorted(scopedItems.map((item) => item.doctor_name)).slice(0, 4);
    return [...departments, ...doctors, ...rooms].slice(0, 12);
  }, [scopedItems]);

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black tracking-tight text-[#061b3d]">快速搜尋</h2>
        <p className="text-sm font-bold text-[#60708d]">搜尋醫師、醫院、科別、診間與備註關鍵字，快速找到拜訪前需要的資訊。</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-[18px] border border-[#dbe5f4] bg-white p-4 shadow-[0_12px_30px_rgba(8,35,80,.08)]">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_148px]">
              <label className="flex h-12 items-center rounded-xl border border-[#dbe5f4] bg-white px-4 shadow-sm focus-within:border-[#075de8]">
                <UiIcon className="mr-3 h-5 w-5 text-[#8aa0bf]" name="search" />
                <input
                  className="w-full bg-transparent text-[15px] font-bold text-[#0d2348] outline-none placeholder:text-[#8aa0bf]"
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="請輸入醫師姓名、科別、醫院、診間、備註內容..."
                  type="search"
                  value={query}
                />
              </label>
              <button
                className="h-12 rounded-xl border border-[#c9d7ea] bg-white px-4 text-sm font-black text-[#075de8] hover:bg-[#f4f8ff] xl:hidden"
                onClick={() => setAdvancedOpen((value) => !value)}
                type="button"
              >
                進階篩選
              </button>
            </div>
            {advancedOpen ? (
              <div className="mt-4 rounded-2xl border border-[#dbe5f4] bg-[#f8fbff] p-4 xl:hidden">
                <SearchFilterControls
                  activeFilterChips={activeFilterChips}
                  branches={branches}
                  departments={departments}
                  doctors={doctors}
                  filters={filters}
                  hospitals={hospitals}
                  regions={regions}
                  onClearFilters={onClearFilters}
                  onFilterChange={onFilterChange}
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                className={`h-11 shrink-0 rounded-xl border px-5 text-sm font-black transition ${
                  activeTab === tab.value
                    ? "border-[#075de8] bg-[#075de8] text-white shadow-lg shadow-blue-600/20"
                    : "border-[#dbe5f4] bg-white text-[#0d2348] hover:border-[#075de8]"
                }`}
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                type="button"
              >
                {tab.label} ({resultCounts[tab.value]})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-y border-[#dbe5f4] py-3 text-sm font-bold text-[#60708d]">
            <span className="font-black text-[#061b3d]">搜尋結果：</span>
            {query ? <SearchChip label={query} onClear={() => onQueryChange("")} /> : <span>尚未輸入關鍵字，顯示常用門診與來源資料。</span>}
            {activeFilterChips.map((chip) => <span className="rounded-lg bg-white px-3 py-2 text-xs font-black text-[#60708d]" key={chip}>{chip}</span>)}
            {query ? (
              <button className="font-black text-[#075de8]" onClick={() => onQueryChange("")} type="button">
                清除全部
              </button>
            ) : null}
            <span className="ml-auto">共 {results.length} 筆結果</span>
            <select className="h-10 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-black text-[#061b3d]">
              <option>排序：相關性</option>
              <option>排序：醫師姓名</option>
              <option>排序：科別</option>
              <option>排序：時段</option>
            </select>
          </div>

          <div className="grid gap-3">
            {results.length ? (
              results.map((result) => (
                <SearchResultCard
                  key={result.id}
                  result={result}
                  onApplyFilters={onApplyFilters}
                  onOpenSchedule={onOpenSchedule}
                  onQueryChange={onQueryChange}
                  onToggleFavorite={onToggleFavorite}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#b8c7dd] bg-white p-8 text-center">
                <h3 className="text-lg font-black text-[#061b3d]">找不到符合條件的資料</h3>
                <p className="mt-2 text-sm font-bold text-[#60708d]">可以改用醫師姓名、科別、醫院名稱、診間或備註關鍵字搜尋。</p>
              </div>
            )}
          </div>
        </div>

        <SearchSidePanel
          activeFilterChips={activeFilterChips}
          branches={branches}
          departments={departments}
          doctors={doctors}
          filters={filters}
          hospitals={hospitals}
          popular={popular}
          recent={query ? [query, ...recentFallback].slice(0, 5) : recentFallback}
          regions={regions}
          onClearFilters={onClearFilters}
          onFilterChange={onFilterChange}
          onSearch={onQueryChange}
        />
      </div>
    </section>
  );
}

function SearchResultCard({
  result,
  onOpenSchedule,
  onApplyFilters,
  onQueryChange,
  onToggleFavorite
}: {
  result: SearchResult;
  onOpenSchedule: (item: DoctorSchedule) => void;
  onApplyFilters: (patch: Partial<FilterState>) => void;
  onQueryChange: (value: string) => void;
  onToggleFavorite: (item: DoctorSchedule) => void;
}) {
  if (result.type === "doctor") {
    return (
      <article className="relative grid gap-3 overflow-hidden rounded-2xl border border-[#dbe5f4] bg-white p-4 shadow-[0_8px_18px_rgba(8,35,80,.055)] md:grid-cols-[32px_64px_minmax(0,1fr)_auto] md:items-center">
        <button className={`absolute right-4 top-4 text-2xl md:static ${result.favorite ? "text-[#f7b928]" : "text-[#9bb0cb]"}`} onClick={() => onToggleFavorite(result.item)} type="button" aria-label={result.favorite ? "取消收藏" : "收藏"}>
          {result.favorite ? "★" : "☆"}
        </button>
        <div className="grid min-w-0 grid-cols-[56px_minmax(0,1fr)] gap-3 pr-8 md:contents md:pr-0">
          <Avatar name={result.item.doctor_name} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black text-[#061b3d]">{result.item.doctor_name}</h3>
              <span className="text-sm font-black text-[#60708d]">醫師</span>
              <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-black text-[#075de8]">{result.item.department}</span>
            </div>
            <p className="mt-1 text-sm font-bold text-[#60708d]">
              {result.item.hospital_name} <span className="text-[#0d2348]">{result.item.branchLabel}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm font-black text-[#0d2348]">
              <span className="rounded-md bg-[#075de8] px-2 py-1 text-xs text-white">今日門診</span>
              <span>{result.item.displayPeriod}</span>
              <span>{result.item.start_time || "時間未標示"}</span>
              <span>{result.item.displayRoom}</span>
              <span className={result.item.status === "正常開診" ? "text-[#168a5d]" : "text-[#f97316]"}>{result.item.status}</span>
            </div>
            {result.note?.content ? <p className="mt-2 line-clamp-2 text-sm font-bold text-[#0d2348]">備註摘要：{result.note.content}</p> : null}
            {result.note?.tags.length ? <p className="mt-1 text-sm font-bold text-[#075de8]">標籤：{result.note.tags.join("、")}</p> : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:w-28 md:grid-cols-1">
          <ActionButton label="查看門診" onClick={() => onOpenSchedule(result.item)} />
          <ActionButton label="查看備註" onClick={() => onOpenSchedule(result.item)} secondary />
          {result.item.originalUrl ? <SourceLink href={result.item.originalUrl} label="查看來源" /> : null}
        </div>
      </article>
    );
  }

  if (result.type === "hospital") {
    return (
      <article className="grid gap-3 rounded-2xl border border-[#dbe5f4] bg-white p-4 shadow-[0_8px_18px_rgba(8,35,80,.055)] md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf2ff] text-[#075de8]">
          <UiIcon className="h-7 w-7" name="database" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-[#061b3d]">{result.hospital.hospital_name}</h3>
            <span className="rounded-md bg-[#dff7ec] px-2 py-1 text-xs font-black text-[#168a5d]">{result.hospital.branch_name || "總院"}</span>
          </div>
          <p className="mt-1 text-sm font-bold text-[#60708d]">{result.hospital.region}，目前收錄 {result.count} 筆門診。</p>
          <p className="mt-2 line-clamp-2 text-sm font-bold text-[#0d2348]">科別：{result.departments.join("、") || "未標示"}</p>
        </div>
        <div className="grid gap-2 md:w-28">
          <ActionButton label="查看門診" onClick={() => onApplyFilters({ hospitalId: result.hospital.id })} />
          {result.hospital.schedule_url ? <SourceLink href={result.hospital.schedule_url} /> : null}
        </div>
      </article>
    );
  }

  if (result.type === "department") {
    return (
      <article className="grid gap-3 rounded-2xl border border-[#dbe5f4] bg-white p-4 shadow-[0_8px_18px_rgba(8,35,80,.055)] md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf2ff] text-xl font-black text-[#075de8]">科</div>
        <div>
          <h3 className="text-lg font-black text-[#061b3d]">{result.department}</h3>
          <p className="mt-1 text-sm font-bold text-[#60708d]">共 {result.count} 筆門診，分布於 {result.hospitals.join("、") || "未標示"}。</p>
        </div>
        <div className="grid gap-2 md:w-28">
          <ActionButton label="查看門診" onClick={() => onApplyFilters({ department: result.department })} />
          <ActionButton label="搜尋科別" onClick={() => onQueryChange(result.department)} secondary />
        </div>
      </article>
    );
  }

  if (result.type === "room") {
    return (
      <article className="grid gap-3 rounded-2xl border border-[#dbe5f4] bg-white p-4 shadow-[0_8px_18px_rgba(8,35,80,.055)] md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf2ff] text-xl font-black text-[#075de8]">診</div>
        <div>
          <h3 className="text-lg font-black text-[#061b3d]">{result.room}</h3>
          <p className="mt-1 text-sm font-bold text-[#60708d]">共 {result.count} 筆門診，分布於 {result.hospitals.join("、") || "未標示"}。</p>
          <p className="mt-2 line-clamp-2 text-sm font-bold text-[#0d2348]">科別：{result.departments.join("、") || "未標示"}</p>
        </div>
        <div className="grid gap-2 md:w-28">
          {result.sample ? <ActionButton label="查看門診" onClick={() => onOpenSchedule(result.sample as DoctorSchedule)} /> : null}
          <ActionButton label="搜尋診間" onClick={() => onQueryChange(result.room)} secondary />
        </div>
      </article>
    );
  }

  const noteItem = result.item;

  return (
    <article className="grid gap-3 rounded-2xl border border-[#dbe5f4] bg-white p-4 shadow-[0_8px_18px_rgba(8,35,80,.055)] md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center">
      <Avatar name={result.item?.doctor_name ?? "備"} />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-black text-[#061b3d]">{result.item?.doctor_name ?? "個人備註"}</h3>
          <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-black text-[#075de8]">{result.note.visitStatus}</span>
        </div>
        <p className="mt-1 text-sm font-bold text-[#60708d]">{result.item ? `${result.item.department}｜${result.item.hospital_name} ${result.item.branchLabel}` : result.note.doctorKey}</p>
        <p className="mt-2 line-clamp-2 text-sm font-bold text-[#0d2348]">{result.note.content || "尚未填寫備註內容"}</p>
        {result.note.tags.length ? <p className="mt-1 text-sm font-bold text-[#075de8]">標籤：{result.note.tags.join("、")}</p> : null}
      </div>
      <div className="grid gap-2 md:w-28">
        {noteItem ? <ActionButton label="查看備註" onClick={() => onOpenSchedule(noteItem)} /> : null}
      </div>
    </article>
  );
}

function SearchSidePanel({
  recent,
  popular,
  filters,
  hospitals,
  regions,
  branches,
  departments,
  doctors,
  activeFilterChips,
  onSearch,
  onFilterChange,
  onClearFilters
}: {
  recent: string[];
  popular: string[];
  filters: FilterState;
  hospitals: Hospital[];
  regions: string[];
  branches: string[];
  departments: string[];
  doctors: string[];
  activeFilterChips: string[];
  onSearch: (value: string) => void;
  onFilterChange: (patch: Partial<FilterState>) => void;
  onClearFilters: () => void;
}) {
  return (
    <aside className="grid content-start gap-4">
      <SideCard title="最近搜尋" action="全部清除">
        <div className="grid gap-3">
          {recent.map((item) => (
            <button className="flex items-center justify-between gap-3 text-left text-sm font-bold text-[#0d2348]" key={item} onClick={() => onSearch(item)} type="button">
              <span className="inline-flex min-w-0 items-center gap-2">
                <UiIcon className="h-4 w-4 shrink-0 text-[#075de8]" name="history" />
                <span className="truncate">{item}</span>
              </span>
              <span className="text-xs text-[#60708d]">最近</span>
            </button>
          ))}
        </div>
      </SideCard>
      <SideCard title="熱門搜尋">
        <div className="flex flex-wrap gap-2">
          {popular.map((item) => (
            <button className="rounded-lg border border-[#dbe5f4] bg-white px-3 py-2 text-sm font-black text-[#0d2348] hover:border-[#075de8] hover:text-[#075de8]" key={item} onClick={() => onSearch(item)} type="button">
              {item}
            </button>
          ))}
        </div>
      </SideCard>
      <SideCard title="搜尋小技巧">
        <ul className="grid gap-3 text-sm font-bold leading-6 text-[#60708d]">
          <li>可使用醫師姓名、科別、醫院名稱進行搜尋。</li>
          <li>可搜尋診間號碼，例如：0107、0215。</li>
          <li>可搜尋備註關鍵字，例如：重點醫師、下午診。</li>
          <li>使用上方分類 Tab 可以縮小搜尋範圍。</li>
        </ul>
      </SideCard>
      <SideCard title="進階篩選" action={activeFilterChips.length ? "可重設" : undefined}>
        <SearchFilterControls
          activeFilterChips={activeFilterChips}
          branches={branches}
          departments={departments}
          doctors={doctors}
          filters={filters}
          hospitals={hospitals}
          regions={regions}
          compact
          onClearFilters={onClearFilters}
          onFilterChange={onFilterChange}
        />
      </SideCard>
    </aside>
  );
}

function SearchFilterControls({
  filters,
  hospitals,
  regions,
  branches,
  departments,
  doctors,
  activeFilterChips,
  compact = false,
  onFilterChange,
  onClearFilters
}: {
  filters: FilterState;
  hospitals: Hospital[];
  regions: string[];
  branches: string[];
  departments: string[];
  doctors: string[];
  activeFilterChips: string[];
  compact?: boolean;
  onFilterChange: (patch: Partial<FilterState>) => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className={compact ? "grid gap-3" : "grid gap-3 md:grid-cols-2 xl:grid-cols-4"}>
        <SearchSelect label="地區" value={filters.region} onChange={(value) => onFilterChange({ region: value, hospitalId: "", branchName: "" })} options={regions} emptyLabel="全部地區" />
        <SearchSelect label="醫院" value={filters.hospitalId} onChange={(value) => onFilterChange({ hospitalId: value, branchName: "" })} options={hospitals.map((item) => ({ value: item.id, label: item.hospital_name }))} emptyLabel="全部醫院" />
        <SearchSelect label="分院" value={filters.branchName} onChange={(value) => onFilterChange({ branchName: value })} options={branches} emptyLabel="全部分院" />
        <SearchSelect label="科別" value={filters.department} onChange={(value) => onFilterChange({ department: value, doctorName: "" })} options={departments} emptyLabel="全部科別" />
        <SearchSelect label="醫師" value={filters.doctorName} onChange={(value) => onFilterChange({ doctorName: value })} options={doctors} emptyLabel="全部醫師" />
        <SearchSelect label="星期" value={filters.weekday} onChange={(value) => onFilterChange({ weekday: value })} options={weekdayOptions} emptyLabel="全部星期" />
        <SearchSelect label="時段" value={filters.period} onChange={(value) => onFilterChange({ period: value })} options={periodOptions} emptyLabel="全部時段" />
        <label className="flex h-[66px] items-end">
          <span className="flex h-11 items-center gap-2 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-black text-[#0d2348]">
            <input checked={filters.favoritesOnly} onChange={(event) => onFilterChange({ favoritesOnly: event.target.checked })} type="checkbox" />
            只看收藏
          </span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-[#e5edf8] pt-4">
        <span className="text-sm font-black text-[#061b3d]">目前條件：</span>
        {activeFilterChips.length ? activeFilterChips.map((chip) => <span className="rounded-lg bg-[#eaf2ff] px-3 py-2 text-xs font-black text-[#075de8]" key={chip}>{chip}</span>) : <span className="text-sm font-bold text-[#60708d]">尚未套用篩選</span>}
        <button className="ml-auto h-10 rounded-xl border border-[#c9d7ea] px-4 text-sm font-black text-[#061b3d]" onClick={onClearFilters} type="button">
          重設
        </button>
      </div>
    </div>
  );
}

function SideCard({ title, action, children }: { title: string; action?: string; children: ReactNode }) {
  return (
    <section className="rounded-[18px] border border-[#dbe5f4] bg-white p-5 shadow-[0_12px_30px_rgba(8,35,80,.08)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-black text-[#061b3d]">{title}</h3>
        {action ? <button className="text-sm font-black text-[#075de8]" type="button">{action}</button> : null}
      </div>
      {children}
    </section>
  );
}

function SearchChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-[#eaf2ff] px-3 py-2 text-sm font-black text-[#075de8]">
      {label}
      <button className="text-[#075de8]" onClick={onClear} type="button" aria-label="清除搜尋">
        ×
      </button>
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-full border border-[#dbe5f4] bg-[#eef5ff] text-xl font-black text-[#075de8]">
      {name.slice(0, 1)}
    </div>
  );
}

function ActionButton({ label, onClick, secondary = false }: { label: string; onClick: () => void; secondary?: boolean }) {
  return (
    <button
      className={`h-10 rounded-xl border px-3 text-sm font-black ${
        secondary ? "border-[#075de8] bg-white text-[#075de8]" : "border-[#075de8] bg-[#075de8] text-white shadow-lg shadow-blue-600/20"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function SearchSelect({
  label,
  value,
  options,
  emptyLabel,
  onChange
}: {
  label: string;
  value: string;
  options: string[] | { value: string; label: string }[];
  emptyLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#0d2348]">
      {label}
      <select
        className="h-11 min-w-0 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-bold outline-none focus:border-[#075de8]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    </label>
  );
}

function SourceLink({ href, label = "查看來源" }: { href: string; label?: string }) {
  return (
    <a className="grid h-10 place-items-center rounded-xl border border-[#075de8] px-3 text-sm font-black text-[#075de8]" href={href} rel="noreferrer" target="_blank">
      {label}
    </a>
  );
}

function matchesAdvancedFilters(item: DoctorSchedule, filters: FilterState, favorites: string[]) {
  return (
    (!filters.region || item.region === filters.region) &&
    (!filters.hospitalId || item.hospital_id === filters.hospitalId) &&
    (!filters.branchName || item.branch_name === filters.branchName) &&
    (!filters.department || item.department === filters.department) &&
    (!filters.doctorName || item.doctor_name === filters.doctorName) &&
    (!filters.weekday || String(item.weekday) === filters.weekday) &&
    (!filters.period || item.displayPeriod === filters.period) &&
    (!filters.favoritesOnly || favorites.includes(doctorKey(item)))
  );
}

function matchesQuery(values: string[], query: string) {
  if (!query) return true;
  return normalize(values.join(" ")).includes(query);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
