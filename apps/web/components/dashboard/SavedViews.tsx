import { useState, type ReactNode } from "react";
import type { DoctorSchedule, PersonalNote } from "../../lib/dashboard";
import { doctorKey } from "../../lib/dashboard";
import type { Hospital } from "../../lib/types";
import { UiIcon, type UiIconName } from "./UiIcon";

type FavoriteDoctorsViewProps = {
  items: DoctorSchedule[];
  notes: PersonalNote[];
  favorites: string[];
  query: string;
  onOpenSchedule: (item: DoctorSchedule) => void;
  onToggleFavorite: (item: DoctorSchedule) => void;
  onGoSearch: () => void;
};

type NotesViewProps = {
  items: DoctorSchedule[];
  notes: PersonalNote[];
  favorites: string[];
  query: string;
  onOpenSchedule: (item: DoctorSchedule) => void;
  onToggleFavorite: (item: DoctorSchedule) => void;
  onGoSearch: () => void;
};

type VisitHistoryViewProps = {
  items: DoctorSchedule[];
  notes: PersonalNote[];
  hospitals: Hospital[];
  query: string;
  onOpenSchedule: (item: DoctorSchedule) => void;
};

type DoctorGroup = {
  key: string;
  primary: DoctorSchedule;
  schedules: DoctorSchedule[];
  note?: PersonalNote;
};

type FavoriteFilter = "all" | "today" | "week" | "follow" | "reminder";
type NoteFilter = "all" | "visited" | "unvisited" | "follow" | "important" | "reminder";

type NoteRow = {
  note: PersonalNote;
  primary?: DoctorSchedule;
  schedules: DoctorSchedule[];
  favorite: boolean;
};

type VisitRecord = NoteRow & {
  id: string;
  date: string;
  displayDate: string;
  visitTime: string;
};

type FavoriteStatCardProps = {
  label: string;
  value: number;
  suffix: string;
  icon: UiIconName;
  tone: "blue" | "green" | "orange" | "purple";
};

export function FavoriteDoctorsView({ items, notes, favorites, query, onOpenSchedule, onToggleFavorite, onGoSearch }: FavoriteDoctorsViewProps) {
  const [activeFilter, setActiveFilter] = useState<FavoriteFilter>("all");
  const noteMap = new Map(notes.map((note) => [note.doctorKey, note]));
  const normalizedQuery = normalize(query);
  const today = new Date().getDay();
  const allGroups = groupDoctors(items)
    .filter((group) => favorites.includes(group.key))
    .map((group) => ({ ...group, note: noteMap.get(group.key) }))
    .filter((group) => matchesDoctorGroup(group, normalizedQuery));
  const groups = allGroups.filter((group) => matchesFavoriteFilter(group, activeFilter, today));
  const tagCounts = countTags(allGroups);
  const reminderGroups = allGroups.filter((group) => group.note?.nextReminder).slice(0, 5);
  const stats: FavoriteStatCardProps[] = [
    { label: "收藏醫師", value: allGroups.length, suffix: "位", icon: "star", tone: "blue" },
    { label: "今日有門診", value: allGroups.filter((group) => hasTodaySchedule(group, today)).length, suffix: "位", icon: "calendar", tone: "green" },
    { label: "本週有門診", value: allGroups.filter((group) => group.schedules.length > 0).length, suffix: "位", icon: "calendar", tone: "purple" },
    { label: "下次提醒", value: allGroups.filter((group) => group.note?.nextReminder).length, suffix: "位", icon: "alarm", tone: "orange" },
    { label: "標籤總數", value: tagCounts.length, suffix: "個", icon: "note", tone: "blue" }
  ];
  const filters: { value: FavoriteFilter; label: string; count: number }[] = [
    { value: "all", label: "全部", count: allGroups.length },
    { value: "today", label: "今日有門診", count: allGroups.filter((group) => hasTodaySchedule(group, today)).length },
    { value: "week", label: "本週有門診", count: allGroups.filter((group) => group.schedules.length > 0).length },
    { value: "follow", label: "需追蹤", count: allGroups.filter((group) => group.note?.visitStatus === "需追蹤").length },
    { value: "reminder", label: "有提醒", count: allGroups.filter((group) => group.note?.nextReminder).length }
  ];

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-[#061b3d]">我的收藏</h2>
        <p className="mt-2 text-sm font-bold text-[#60708d]">常拜訪醫師管理中心，快速掌握今日門診、追蹤提醒與拜訪優先順序。</p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-[18px] border border-[#dbe5f4] bg-white p-3 shadow-[0_12px_30px_rgba(8,35,80,.08)] sm:p-4 md:grid-cols-5">
        {stats.map((stat) => (
          <FavoriteStatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <button
                className={`h-11 shrink-0 rounded-xl border px-4 text-sm font-black transition ${
                  activeFilter === filter.value
                    ? "border-[#075de8] bg-[#075de8] text-white shadow-lg shadow-blue-600/20"
                    : "border-[#dbe5f4] bg-white text-[#0d2348] hover:border-[#075de8]"
                }`}
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                type="button"
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            {groups.length ? (
              groups.map((group) => (
                <SavedDoctorCard
                  favorite
                  group={group}
                  key={group.key}
                  today={today}
                  onEditNote={() => onOpenSchedule(group.primary)}
                  onOpenSchedule={() => onOpenSchedule(bestScheduleForVisit(group, today))}
                  onToggleFavorite={() => onToggleFavorite(group.primary)}
                />
              ))
            ) : (
              <EmptySavedState
                title={favorites.length ? "目前條件沒有收藏醫師" : "尚未收藏醫師"}
                description={favorites.length ? "可以切換上方分類，或清空搜尋字再查看收藏醫師。" : "從今日門診或快速搜尋把常拜訪醫師加入收藏，就會集中在這裡。"}
                actionLabel="前往快速搜尋"
                onAction={onGoSearch}
              />
            )}
          </div>
        </div>

        <FavoriteSidePanel groups={allGroups} reminderGroups={reminderGroups} tagCounts={tagCounts} today={today} />
      </div>
    </section>
  );
}

export function NotesView({ items, notes, favorites, query, onOpenSchedule, onToggleFavorite, onGoSearch }: NotesViewProps) {
  const [activeFilter, setActiveFilter] = useState<NoteFilter>("all");
  const scheduleMap = new Map<string, DoctorSchedule[]>();
  for (const item of items) {
    const key = doctorKey(item);
    scheduleMap.set(key, [...(scheduleMap.get(key) ?? []), item]);
  }
  const normalizedQuery = normalize(query);
  const allRows = notes
    .map((note) => {
      const schedules = scheduleMap.get(note.doctorKey) ?? [];
      return {
        note,
        primary: schedules[0],
        schedules,
        favorite: schedules[0] ? favorites.includes(doctorKey(schedules[0])) : false
      };
    })
    .filter((row) => matchesNoteRow(row, normalizedQuery));
  const rows = allRows.filter((row) => matchesNoteFilter(row, activeFilter));
  const tagCounts = countNoteTags(allRows);
  const reminderRows = allRows.filter((row) => row.note.nextReminder).slice(0, 5);
  const followRows = allRows.filter((row) => row.note.visitStatus === "需追蹤").slice(0, 5);
  const stats: FavoriteStatCardProps[] = [
    { label: "全部備註", value: allRows.length, suffix: "筆", icon: "note", tone: "blue" },
    { label: "需追蹤", value: allRows.filter((row) => row.note.visitStatus === "需追蹤").length, suffix: "筆", icon: "refresh", tone: "orange" },
    { label: "已拜訪", value: allRows.filter((row) => row.note.visitStatus === "已拜訪").length, suffix: "筆", icon: "history", tone: "green" },
    { label: "下次提醒", value: allRows.filter((row) => row.note.nextReminder).length, suffix: "筆", icon: "alarm", tone: "purple" },
    { label: "重點醫師", value: allRows.filter((row) => row.note.tags.some((tag) => tag.includes("重點"))).length, suffix: "位", icon: "star", tone: "blue" }
  ];
  const filters: { value: NoteFilter; label: string; count: number }[] = [
    { value: "all", label: "全部", count: allRows.length },
    { value: "visited", label: "已拜訪", count: allRows.filter((row) => row.note.visitStatus === "已拜訪").length },
    { value: "unvisited", label: "尚未拜訪", count: allRows.filter((row) => row.note.visitStatus === "尚未拜訪").length },
    { value: "follow", label: "需追蹤", count: allRows.filter((row) => row.note.visitStatus === "需追蹤").length },
    { value: "important", label: "重點醫師", count: allRows.filter((row) => row.note.tags.some((tag) => tag.includes("重點"))).length },
    { value: "reminder", label: "有提醒", count: allRows.filter((row) => row.note.nextReminder).length }
  ];

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-[#061b3d]">我的備註</h2>
        <p className="mt-2 text-sm font-bold text-[#60708d]">醫療業務 CRM 筆記管理中心，快速掌握拜訪狀態、下次提醒與下一步行動。</p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-[18px] border border-[#dbe5f4] bg-white p-3 shadow-[0_12px_30px_rgba(8,35,80,.08)] sm:p-4 md:grid-cols-5">
        {stats.map((stat) => (
          <FavoriteStatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                className={`h-11 shrink-0 rounded-xl border px-4 text-sm font-black transition ${
                  activeFilter === filter.value
                    ? "border-[#075de8] bg-[#075de8] text-white shadow-lg shadow-blue-600/20"
                    : "border-[#dbe5f4] bg-white text-[#0d2348] hover:border-[#075de8]"
                }`}
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                type="button"
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            {rows.length ? (
              rows.map((row) => (
                <NoteCrmCard
                  key={row.note.doctorKey}
                  row={row}
                  onEditNote={() => row.primary && onOpenSchedule(row.primary)}
                  onOpenDoctor={() => row.primary && onOpenSchedule(row.primary)}
                  onToggleFavorite={() => row.primary && onToggleFavorite(row.primary)}
                />
              ))
            ) : (
              <EmptySavedState
                title={notes.length ? "目前條件沒有備註" : "尚未建立個人備註"}
                description={notes.length ? "可以切換上方分類，或清空搜尋字再查看 CRM 筆記。" : "在醫師詳細資料中建立拜訪狀態、提醒與標籤後，會集中在這裡。"}
                actionLabel="前往快速搜尋"
                onAction={onGoSearch}
              />
            )}
          </div>
        </div>

        <NotesSidePanel rows={allRows} reminderRows={reminderRows} followRows={followRows} tagCounts={tagCounts} />
      </div>
    </section>
  );
}

export function VisitHistoryView({ items, notes, hospitals, query, onOpenSchedule }: VisitHistoryViewProps) {
  const today = new Date().getDay();
  const [dateFrom, setDateFrom] = useState("2026-04-15");
  const [dateTo, setDateTo] = useState("2026-05-16");
  const [region, setRegion] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [doctorQuery, setDoctorQuery] = useState("");
  const allRecords = buildVisitRecords(items, notes).filter((record) => matchesVisitRecord(record, normalize(query)));
  const regions = uniqueList(hospitals.map((hospital) => hospital.region));
  const hospitalOptions = hospitals.filter((hospital) => !region || hospital.region === region);
  const departments = uniqueList(allRecords.map((record) => record.primary?.department ?? ""));
  const records = allRecords.filter((record) => {
    const recordRegion = record.primary?.region ?? "";
    const recordHospitalId = record.primary?.hospital_id ?? "";
    const recordDepartment = record.primary?.department ?? "";
    const doctorTarget = normalize([record.primary?.doctor_name ?? "", record.note.content, ...record.note.tags].join(" "));
    const withinDate = !record.date || ((!dateFrom || record.date >= dateFrom) && (!dateTo || record.date <= dateTo));

    return (
      withinDate &&
      (!region || recordRegion === region) &&
      (!hospitalId || recordHospitalId === hospitalId) &&
      (!department || recordDepartment === department) &&
      (!status || record.note.visitStatus === status) &&
      (!doctorQuery || doctorTarget.includes(normalize(doctorQuery)))
    );
  });
  const followRecords = records.filter((record) => record.note.visitStatus === "需追蹤");
  const reminderRecords = records.filter((record) => record.note.nextReminder);
  const visitedCount = records.filter((record) => record.note.visitStatus === "已拜訪").length;
  const stats: FavoriteStatCardProps[] = [
    { label: "拜訪總次數", value: records.length, suffix: "次", icon: "history", tone: "blue" },
    { label: "已拜訪", value: visitedCount, suffix: "次", icon: "calendar", tone: "green" },
    { label: "需追蹤", value: followRecords.length, suffix: "位", icon: "refresh", tone: "orange" },
    { label: "新增備註", value: records.length, suffix: "筆", icon: "note", tone: "blue" },
    { label: "下次提醒", value: reminderRecords.length, suffix: "筆", icon: "alarm", tone: "purple" }
  ];
  const grouped = groupVisitRecords(records);

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-[#061b3d]">拜訪紀錄</h2>
        <p className="mt-2 text-sm font-bold text-[#60708d]">歷史拜訪紀錄與追蹤時間軸，回顧之前拜訪過誰、當時記了什麼、下一步要做什麼。</p>
      </div>

      <div className="rounded-[18px] border border-[#dbe5f4] bg-white p-4 shadow-[0_12px_30px_rgba(8,35,80,.08)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <label className="grid gap-2 text-sm font-black text-[#0d2348]">
            拜訪日期
            <div className="grid grid-cols-2 gap-2">
              <input className="h-11 rounded-xl border border-[#dbe5f4] px-3 text-sm font-bold outline-none focus:border-[#075de8]" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              <input className="h-11 rounded-xl border border-[#dbe5f4] px-3 text-sm font-bold outline-none focus:border-[#075de8]" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
          </label>
          <FilterSelect label="地區" value={region} onChange={(next) => {
            setRegion(next);
            setHospitalId("");
          }}>
            <option value="">全部地區</option>
            {regions.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="醫院" value={hospitalId} onChange={setHospitalId}>
            <option value="">全部醫院</option>
            {hospitalOptions.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.hospital_name}</option>)}
          </FilterSelect>
          <FilterSelect label="科別" value={department} onChange={setDepartment}>
            <option value="">全部科別</option>
            {departments.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="拜訪狀態" value={status} onChange={setStatus}>
            <option value="">全部狀態</option>
            <option value="已拜訪">已拜訪</option>
            <option value="需追蹤">需追蹤</option>
            <option value="尚未拜訪">尚未拜訪</option>
          </FilterSelect>
          <label className="grid gap-2 text-sm font-black text-[#0d2348]">
            搜尋醫師
            <input
              className="h-11 rounded-xl border border-[#dbe5f4] px-3 text-sm font-bold outline-none focus:border-[#075de8]"
              placeholder="搜尋醫師姓名"
              value={doctorQuery}
              onChange={(event) => setDoctorQuery(event.target.value)}
            />
          </label>
          <button className="self-end rounded-xl border border-[#075de8] bg-white px-4 py-3 text-sm font-black text-[#075de8] hover:bg-[#eaf2ff]" onClick={() => exportVisitRecords(records)} type="button">
            匯出紀錄
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#eef3fb] pt-4 md:grid-cols-5">
          {stats.map((stat) => (
            <FavoriteStatCard key={stat.label} {...stat} />
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {grouped.length ? (
            <div className="relative grid gap-5 pl-5 before:absolute before:left-[7px] before:top-3 before:h-[calc(100%-24px)] before:w-px before:bg-[#cfe0f4]">
              {grouped.map((group) => (
                <section className="relative grid gap-3" key={group.label}>
                  <div className="absolute -left-5 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#075de8] ring-4 ring-[#eaf2ff]" />
                  <h3 className="text-sm font-black text-[#061b3d]">{group.label}</h3>
                  <div className="grid gap-3">
                    {group.records.map((record) => (
                      <VisitTimelineCard key={record.id} record={record} today={today} onOpenSchedule={() => record.primary && onOpenSchedule(record.primary)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <EmptySavedState
              title="目前條件沒有拜訪紀錄"
              description="可以放寬日期或狀態條件，再查看歷史拜訪與追蹤狀態。"
              actionLabel="清除醫師搜尋"
              onAction={() => setDoctorQuery("")}
            />
          )}
        </div>

        <VisitHistorySidePanel records={records} followRecords={followRecords} reminderRecords={reminderRecords} />
      </div>
    </section>
  );
}

function SavedDoctorCard({
  group,
  favorite,
  today,
  onOpenSchedule,
  onEditNote,
  onToggleFavorite
}: {
  group: DoctorGroup;
  favorite: boolean;
  today: number;
  onOpenSchedule: () => void;
  onEditNote: () => void;
  onToggleFavorite: () => void;
}) {
  const visitSchedule = bestScheduleForVisit(group, today);
  const nextReminder = group.note?.nextReminder || "未設定提醒";
  const tags = group.note?.tags ?? [];

  return (
    <article className="rounded-2xl border border-[#dbe5f4] bg-white p-4 shadow-[0_8px_18px_rgba(8,35,80,.055)]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.75fr)_180px] lg:items-center">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <button className={`text-2xl ${favorite ? "text-[#f7b928]" : "text-[#9bb0cb]"}`} onClick={onToggleFavorite} type="button" aria-label={favorite ? "取消收藏" : "加入收藏"}>
              {favorite ? "★" : "☆"}
            </button>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#dbe5f4] bg-[#eef5ff] text-xl font-black text-[#075de8]">
              {group.primary.doctor_name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black text-[#061b3d]">{group.primary.doctor_name}</h3>
                <span className="text-sm font-black text-[#60708d]">醫師</span>
                <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-black text-[#075de8]">{group.primary.department}</span>
                {group.note?.visitStatus ? <span className={visitBadgeClass(group.note.visitStatus)}>{group.note.visitStatus}</span> : null}
              </div>
              <p className="mt-1 text-sm font-bold text-[#60708d]">
                {group.primary.hospital_name} <span className="text-[#0d2348]">{group.primary.branchLabel}</span>
              </p>
            </div>
          </div>
          {tags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => <span className="rounded-lg bg-[#eaf2ff] px-3 py-2 text-xs font-black text-[#075de8]" key={tag}>{tag}</span>)}
            </div>
          ) : null}
        </div>

        <div className="grid gap-2 rounded-2xl border border-[#dbe5f4] bg-[#f8fbff] p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm font-black text-[#0d2348]">
            <span className="rounded-md bg-[#075de8] px-2 py-1 text-xs text-white">{visitSchedule ? scheduleTimingLabel(visitSchedule, today) : "無門診"}</span>
            <span>{visitSchedule?.displayPeriod ?? "未標示"}</span>
            <span>{visitSchedule?.start_time || "時間未標示"}</span>
          </div>
          <div className="text-sm font-black text-[#0d2348]">{visitSchedule?.displayRoom ?? "診間 未標示"}</div>
          <div className={visitSchedule?.status === "正常開診" ? "text-sm font-black text-[#168a5d]" : "text-sm font-black text-[#f97316]"}>
            {visitSchedule?.status ?? "無門診"}
          </div>
          <div className="border-t border-[#dbe5f4] pt-2 text-sm font-bold leading-6 text-[#60708d]">
            <span className="block font-black text-[#061b3d]">下次提醒</span>
            {nextReminder}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          <ActionButton label="查看門診" onClick={onOpenSchedule} />
          <ActionButton label="編輯備註" onClick={onEditNote} secondary />
        </div>
      </div>
    </article>
  );
}

function FavoriteSidePanel({
  groups,
  reminderGroups,
  tagCounts,
  today
}: {
  groups: DoctorGroup[];
  reminderGroups: DoctorGroup[];
  tagCounts: { tag: string; count: number }[];
  today: number;
}) {
  const todayCount = groups.filter((group) => hasTodaySchedule(group, today)).length;
  const followCount = groups.filter((group) => group.note?.visitStatus === "需追蹤").length;

  return (
    <aside className="grid content-start gap-4">
      <SideCard title="收藏概況">
        <div className="grid gap-4">
          <div className="mx-auto grid h-32 w-32 place-items-center rounded-full border-[18px] border-[#075de8] bg-[#f8fbff] text-center shadow-inner">
            <div>
              <div className="text-3xl font-black text-[#061b3d]">{groups.length}</div>
              <div className="text-xs font-black text-[#60708d]">總收藏數</div>
            </div>
          </div>
          <div className="grid gap-3 text-sm font-bold text-[#60708d]">
            <SummaryLine label="今日有門診" value={`${todayCount} 位`} />
            <SummaryLine label="需追蹤" value={`${followCount} 位`} highlight={followCount > 0} />
            <SummaryLine label="已設定提醒" value={`${reminderGroups.length} 位`} />
            <SummaryLine label="可安排拜訪" value={`${groups.filter((group) => group.schedules.length > 0).length} 位`} />
          </div>
        </div>
      </SideCard>

      <SideCard title="標籤分布">
        {tagCounts.length ? (
          <div className="grid gap-3">
            {tagCounts.slice(0, 6).map((item) => (
              <div className="grid gap-1" key={item.tag}>
                <div className="flex items-center justify-between text-sm font-black text-[#0d2348]">
                  <span>{item.tag}</span>
                  <span>{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#eaf2ff]">
                  <div className="h-full rounded-full bg-[#075de8]" style={{ width: `${Math.max(12, (item.count / Math.max(1, groups.length)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold leading-6 text-[#60708d]">尚未建立標籤，之後可用重點醫師、需追蹤、熟客等標籤管理拜訪優先順序。</p>
        )}
      </SideCard>

      <SideCard title="提醒摘要">
        {reminderGroups.length ? (
          <div className="grid gap-3">
            {reminderGroups.map((group) => (
              <div className="rounded-xl bg-[#f8fbff] p-3" key={group.key}>
                <div className="font-black text-[#061b3d]">{group.primary.doctor_name}</div>
                <div className="mt-1 text-sm font-bold leading-6 text-[#60708d]">{group.note?.nextReminder}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold leading-6 text-[#60708d]">尚未設定下次提醒。建議替重點醫師設定拜訪前提醒。</p>
        )}
      </SideCard>
    </aside>
  );
}

function NoteCrmCard({
  row,
  onOpenDoctor,
  onEditNote,
  onToggleFavorite
}: {
  row: NoteRow;
  onOpenDoctor: () => void;
  onEditNote: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <article className="rounded-2xl border border-[#dbe5f4] bg-white p-4 shadow-[0_8px_18px_rgba(8,35,80,.055)]">
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,0.9fr)_minmax(220px,1fr)_170px_160px] 2xl:items-center">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <button className={`text-2xl ${row.favorite ? "text-[#f7b928]" : "text-[#9bb0cb]"}`} onClick={onToggleFavorite} type="button" aria-label={row.favorite ? "取消收藏" : "加入收藏"}>
              {row.favorite ? "★" : "☆"}
            </button>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#dbe5f4] bg-[#eef5ff] text-xl font-black text-[#075de8]">
              {(row.primary?.doctor_name ?? "備").slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black text-[#061b3d]">{row.primary?.doctor_name ?? "未對應醫師"}</h3>
                <span className="text-sm font-black text-[#60708d]">醫師</span>
                {row.primary ? <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-black text-[#075de8]">{row.primary.department}</span> : null}
              </div>
              <p className="mt-1 text-sm font-bold text-[#60708d]">
                {row.primary ? `${row.primary.hospital_name} ${row.primary.branchLabel}` : row.note.doctorKey}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-xs font-black text-[#60708d]">備註摘要</div>
          <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-[#0d2348]">{row.note.content || "尚未填寫備註內容"}</p>
          {row.note.tags.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {row.note.tags.map((tag) => <span className="rounded-lg bg-[#eaf2ff] px-3 py-1.5 text-xs font-black text-[#075de8]" key={tag}>{tag}</span>)}
            </div>
          ) : null}
        </div>

        <div className="grid gap-2 rounded-2xl border border-[#dbe5f4] bg-[#f8fbff] p-3 text-sm font-bold text-[#60708d]">
          <div>
            <span className="block text-xs font-black text-[#60708d]">拜訪狀態</span>
            <span className={visitBadgeClass(row.note.visitStatus)}>{row.note.visitStatus}</span>
          </div>
          <div>
            <span className="block text-xs font-black text-[#60708d]">上次拜訪</span>
            <span className="font-black text-[#0d2348]">{row.note.lastVisitDate || "未標示"}</span>
          </div>
          <div>
            <span className="block text-xs font-black text-[#60708d]">下次提醒</span>
            <span className="font-black text-[#0d2348]">{row.note.nextReminder || "未設定"}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 2xl:grid-cols-1">
          {row.primary ? <ActionButton label="查看醫師" onClick={onOpenDoctor} /> : null}
          {row.primary ? <ActionButton label="編輯備註" onClick={onEditNote} secondary /> : null}
        </div>
      </div>
    </article>
  );
}

function NotesSidePanel({
  rows,
  reminderRows,
  followRows,
  tagCounts
}: {
  rows: NoteRow[];
  reminderRows: NoteRow[];
  followRows: NoteRow[];
  tagCounts: { tag: string; count: number }[];
}) {
  return (
    <aside className="grid content-start gap-4">
      <SideCard title="備註概況">
        <div className="grid gap-3 text-sm font-bold text-[#60708d]">
          <SummaryLine label="總備註數" value={`${rows.length} 筆`} />
          <SummaryLine label="已拜訪" value={`${rows.filter((row) => row.note.visitStatus === "已拜訪").length} 筆`} />
          <SummaryLine label="需追蹤" value={`${followRows.length} 筆`} highlight={followRows.length > 0} />
          <SummaryLine label="尚未拜訪" value={`${rows.filter((row) => row.note.visitStatus === "尚未拜訪").length} 筆`} />
          <SummaryLine label="下次提醒" value={`${reminderRows.length} 筆`} />
        </div>
      </SideCard>

      <SideCard title="今日提醒">
        {reminderRows.length ? (
          <div className="grid gap-3">
            {reminderRows.map((row) => (
              <div className="rounded-xl bg-[#f8fbff] p-3" key={row.note.doctorKey}>
                <div className="font-black text-[#061b3d]">{row.primary?.doctor_name ?? "未對應醫師"}</div>
                <div className="mt-1 text-sm font-bold leading-6 text-[#60708d]">{row.note.nextReminder}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold leading-6 text-[#60708d]">目前沒有設定提醒。建議替需追蹤醫師補上下次行動。</p>
        )}
      </SideCard>

      <SideCard title="需追蹤名單">
        {followRows.length ? (
          <div className="grid gap-3">
            {followRows.map((row) => (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fbff] p-3" key={row.note.doctorKey}>
                <div>
                  <div className="font-black text-[#061b3d]">{row.primary?.doctor_name ?? "未對應醫師"}</div>
                  <div className="mt-1 text-xs font-bold text-[#60708d]">{row.primary?.department ?? row.note.doctorKey}</div>
                </div>
                <span className={visitBadgeClass(row.note.visitStatus)}>{row.note.visitStatus}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold leading-6 text-[#60708d]">目前沒有需追蹤名單。</p>
        )}
      </SideCard>

      <SideCard title="標籤分類">
        {tagCounts.length ? (
          <div className="flex flex-wrap gap-2">
            {tagCounts.slice(0, 10).map((item) => (
              <span className="rounded-lg bg-[#eaf2ff] px-3 py-2 text-xs font-black text-[#075de8]" key={item.tag}>{item.tag} {item.count}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold leading-6 text-[#60708d]">尚未建立標籤，可用重點醫師、需追蹤、熟客分類。</p>
        )}
      </SideCard>

      <SideCard title="備註小技巧">
        <ul className="grid gap-3 text-sm font-bold leading-6 text-[#60708d]">
          <li>備註第一句寫下拜訪結論，方便下次快速回想。</li>
          <li>用「需追蹤」標記下一步尚未完成的醫師。</li>
          <li>下次提醒請寫明時間點與行動，例如：下週二上午帶資料。</li>
        </ul>
      </SideCard>
    </aside>
  );
}

function VisitTimelineCard({
  record,
  today,
  onOpenSchedule
}: {
  record: VisitRecord;
  today: number;
  onOpenSchedule: () => void;
}) {
  const schedule = record.primary ? bestScheduleForVisit({ key: doctorKey(record.primary), primary: record.primary, schedules: record.schedules }, today) : undefined;

  return (
    <article className="rounded-2xl border border-[#dbe5f4] bg-white p-4 shadow-[0_8px_18px_rgba(8,35,80,.055)]">
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_160px_minmax(220px,0.95fr)_170px] 2xl:items-center">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#dbe5f4] bg-[#eef5ff] text-xl font-black text-[#075de8]">
              {(record.primary?.doctor_name ?? "訪").slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black text-[#061b3d]">{record.primary?.doctor_name ?? "未對應醫師"}</h3>
                <span className="text-sm font-black text-[#60708d]">醫師</span>
                {record.primary ? <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-black text-[#075de8]">{record.primary.department}</span> : null}
                <span className={visitBadgeClass(record.note.visitStatus)}>{record.note.visitStatus}</span>
              </div>
              <p className="mt-1 text-sm font-bold text-[#60708d]">
                {record.primary ? `${record.primary.hospital_name} ${record.primary.branchLabel}` : record.note.doctorKey}
              </p>
              {schedule ? (
                <p className="mt-2 text-sm font-bold text-[#0d2348]">
                  當日門診：{schedule.weekday_label} {schedule.displayPeriod} {schedule.start_time || "時間未標示"} {schedule.displayRoom}
                </p>
              ) : (
                <p className="mt-2 text-sm font-bold text-[#60708d]">當日門診：尚未對應門診資料</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe5f4] bg-[#f8fbff] p-3">
          <div className="text-xs font-black text-[#60708d]">拜訪時間</div>
          <div className="mt-2 text-lg font-black text-[#061b3d]">{record.visitTime}</div>
          <div className="mt-1 text-sm font-bold text-[#60708d]">{record.displayDate}</div>
        </div>

        <div className="min-w-0">
          <div className="text-xs font-black text-[#60708d]">拜訪紀錄摘要</div>
          <p className="mt-2 line-clamp-3 text-sm font-bold leading-6 text-[#0d2348]">{record.note.content || "尚未填寫拜訪紀錄摘要"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {record.note.tags.map((tag) => <span className="rounded-lg bg-[#eaf2ff] px-3 py-1.5 text-xs font-black text-[#075de8]" key={tag}>{tag}</span>)}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-[#dbe5f4] bg-[#f8fbff] p-3 text-sm font-bold leading-6 text-[#60708d]">
            <span className="block text-xs font-black text-[#60708d]">下次提醒</span>
            <span className="font-black text-[#0d2348]">{record.note.nextReminder || "未設定"}</span>
          </div>
          {record.primary ? <ActionButton label="查看備註" onClick={onOpenSchedule} secondary /> : null}
        </div>
      </div>
    </article>
  );
}

function VisitHistorySidePanel({
  records,
  followRecords,
  reminderRecords
}: {
  records: VisitRecord[];
  followRecords: VisitRecord[];
  reminderRecords: VisitRecord[];
}) {
  const total = Math.max(1, records.length);
  const visited = records.filter((record) => record.note.visitStatus === "已拜訪").length;
  const unvisited = records.filter((record) => record.note.visitStatus === "尚未拜訪").length;
  const trend = buildVisitTrend(records);

  return (
    <aside className="grid content-start gap-4">
      <SideCard title="拜訪概況">
        <div className="grid gap-4">
          <div className="mx-auto grid h-32 w-32 place-items-center rounded-full border-[18px] border-[#075de8] bg-[#f8fbff] text-center shadow-inner">
            <div>
              <div className="text-3xl font-black text-[#061b3d]">{records.length}</div>
              <div className="text-xs font-black text-[#60708d]">總拜訪次數</div>
            </div>
          </div>
          <div className="grid gap-3 text-sm font-bold text-[#60708d]">
            <SummaryLine label="已拜訪" value={`${visited} (${Math.round((visited / total) * 100)}%)`} />
            <SummaryLine label="需追蹤" value={`${followRecords.length} (${Math.round((followRecords.length / total) * 100)}%)`} highlight={followRecords.length > 0} />
            <SummaryLine label="尚未拜訪" value={`${unvisited} (${Math.round((unvisited / total) * 100)}%)`} />
            <SummaryLine label="下次提醒" value={`${reminderRecords.length} 筆`} />
          </div>
        </div>
      </SideCard>

      <SideCard title="近期拜訪趨勢">
        <div className="grid gap-3">
          {trend.map((item) => (
            <div className="grid gap-1" key={item.label}>
              <div className="flex items-center justify-between text-xs font-black text-[#60708d]">
                <span>{item.label}</span>
                <span>{item.count} 筆</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#eaf2ff]">
                <div className="h-full rounded-full bg-[#075de8]" style={{ width: `${Math.max(12, (item.count / Math.max(1, records.length)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </SideCard>

      <SideCard title="需追蹤名單 Top 5">
        {followRecords.length ? (
          <div className="grid gap-3">
            {followRecords.slice(0, 5).map((record, index) => (
              <div className="flex items-start gap-3 rounded-xl bg-[#f8fbff] p-3" key={record.id}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#075de8] text-xs font-black text-white">{index + 1}</span>
                <div className="min-w-0">
                  <div className="font-black text-[#061b3d]">{record.primary?.doctor_name ?? "未對應醫師"}</div>
                  <div className="mt-1 text-xs font-bold leading-5 text-[#60708d]">{record.note.nextReminder || record.note.content}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold leading-6 text-[#60708d]">目前沒有需追蹤名單。</p>
        )}
      </SideCard>

      <SideCard title="小提醒">
        <p className="text-sm font-bold leading-6 text-[#60708d]">善用拜訪紀錄追蹤醫師需求與下次行動，讓每次拜訪都有清楚的後續安排。</p>
        <button className="mt-4 h-11 w-full rounded-xl bg-[#075de8] px-4 text-sm font-black text-white shadow-lg shadow-blue-600/20" type="button">
          前往行程提醒
        </button>
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

function EmptySavedState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <section className="rounded-[18px] border border-dashed border-[#b8c7dd] bg-white p-8 text-center shadow-[0_12px_30px_rgba(8,35,80,.08)]">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#eaf2ff] text-[#075de8]">
        <UiIcon className="h-8 w-8" name="star" />
      </div>
      <h2 className="text-2xl font-black text-[#061b3d]">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-6 text-[#60708d]">{description}</p>
      <button className="mt-5 h-11 rounded-xl bg-[#075de8] px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20" onClick={onAction} type="button">
        {actionLabel}
      </button>
    </section>
  );
}

function FavoriteStatCard({
  label,
  value,
  suffix,
  icon,
  tone
}: FavoriteStatCardProps) {
  const toneClass = {
    blue: "bg-[#eaf2ff] text-[#075de8]",
    green: "bg-[#dff7ec] text-[#168a5d]",
    orange: "bg-[#fff1e8] text-[#f97316]",
    purple: "bg-[#f0eaff] text-[#7c3aed]"
  }[tone];

  return (
    <div className="rounded-2xl bg-[#f8fbff] p-2.5 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl sm:h-11 sm:w-11 ${toneClass}`}>
          <UiIcon className="h-5 w-5" name={icon} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-xs font-black text-[#60708d] sm:text-sm">{label}</div>
          <div className="mt-1 flex items-end gap-1">
            <span className="text-xl font-black text-[#061b3d] sm:text-3xl">{value}</span>
            <span className="pb-0.5 text-xs font-black text-[#60708d] sm:pb-1 sm:text-sm">{suffix}</span>
          </div>
        </div>
      </div>
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

function SummaryLine({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#eef3fb] pb-2 last:border-0 last:pb-0">
      <span>{label}</span>
      <span className={highlight ? "font-black text-[#f97316]" : "font-black text-[#061b3d]"}>{value}</span>
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

function groupDoctors(items: DoctorSchedule[]) {
  const map = new Map<string, DoctorGroup>();
  for (const item of items) {
    const key = doctorKey(item);
    const group = map.get(key);
    if (group) {
      group.schedules.push(item);
    } else {
      map.set(key, { key, primary: item, schedules: [item] });
    }
  }
  return Array.from(map.values());
}

function matchesDoctorGroup(group: DoctorGroup, query: string) {
  if (!query) return true;
  return normalize([
    group.primary.doctor_name,
    group.primary.department,
    group.primary.hospital_name,
    group.primary.branch_name,
    group.primary.displayRoom,
    group.note?.content ?? "",
    group.note?.visitStatus ?? "",
    ...(group.note?.tags ?? [])
  ].join(" ")).includes(query);
}

function matchesFavoriteFilter(group: DoctorGroup, filter: FavoriteFilter, today: number) {
  if (filter === "today") return hasTodaySchedule(group, today);
  if (filter === "week") return group.schedules.length > 0;
  if (filter === "follow") return group.note?.visitStatus === "需追蹤";
  if (filter === "reminder") return Boolean(group.note?.nextReminder);
  return true;
}

function hasTodaySchedule(group: DoctorGroup, today: number) {
  return group.schedules.some((item) => item.weekday === today);
}

function bestScheduleForVisit(group: DoctorGroup, today: number) {
  return group.schedules.find((item) => item.weekday === today) ?? group.schedules[0] ?? group.primary;
}

function scheduleTimingLabel(item: DoctorSchedule, today: number) {
  return item.weekday === today ? "今日門診" : "本週門診";
}

function countTags(groups: DoctorGroup[]) {
  const map = new Map<string, number>();
  for (const group of groups) {
    for (const tag of group.note?.tags ?? []) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-Hant"));
}

function matchesNoteRow(row: NoteRow, query: string) {
  if (!query) return true;
  return normalize([
    row.note.content,
    row.note.visitStatus,
    row.note.lastVisitDate,
    row.note.nextReminder,
    ...row.note.tags,
    row.primary?.doctor_name ?? "",
    row.primary?.department ?? "",
    row.primary?.hospital_name ?? "",
    row.primary?.displayRoom ?? ""
  ].join(" ")).includes(query);
}

function matchesNoteFilter(row: NoteRow, filter: NoteFilter) {
  if (filter === "visited") return row.note.visitStatus === "已拜訪";
  if (filter === "unvisited") return row.note.visitStatus === "尚未拜訪";
  if (filter === "follow") return row.note.visitStatus === "需追蹤";
  if (filter === "important") return row.note.tags.some((tag) => tag.includes("重點"));
  if (filter === "reminder") return Boolean(row.note.nextReminder);
  return true;
}

function countNoteTags(rows: NoteRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.note.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-Hant"));
}

function buildVisitRecords(items: DoctorSchedule[], notes: PersonalNote[]) {
  const scheduleMap = new Map<string, DoctorSchedule[]>();
  for (const item of items) {
    const key = doctorKey(item);
    scheduleMap.set(key, [...(scheduleMap.get(key) ?? []), item]);
  }

  return notes
    .map((note, index) => {
      const schedules = scheduleMap.get(note.doctorKey) ?? [];
      const primary = schedules[0];
      const date = note.lastVisitDate;
      return {
        note,
        primary,
        schedules,
        favorite: false,
        id: `${note.doctorKey}-${date || "pending"}-${index}`,
        date,
        displayDate: date ? formatVisitDate(date) : "待安排",
        visitTime: date ? (primary?.start_time ?? "未記錄") : "待安排"
      };
    })
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
}

function groupVisitRecords(records: VisitRecord[]) {
  const map = new Map<string, VisitRecord[]>();
  for (const record of records) {
    const label = record.date ? `${formatVisitDate(record.date)} (${record.primary?.weekday_label ?? "未標示星期"})` : "待安排";
    map.set(label, [...(map.get(label) ?? []), record]);
  }
  return Array.from(map.entries()).map(([label, groupedRecords]) => ({ label, records: groupedRecords }));
}

function matchesVisitRecord(record: VisitRecord, query: string) {
  if (!query) return true;
  return normalize([
    record.note.content,
    record.note.visitStatus,
    record.note.lastVisitDate,
    record.note.nextReminder,
    ...record.note.tags,
    record.primary?.doctor_name ?? "",
    record.primary?.department ?? "",
    record.primary?.hospital_name ?? "",
    record.primary?.branch_name ?? "",
    record.primary?.displayRoom ?? ""
  ].join(" ")).includes(query);
}

function buildVisitTrend(records: VisitRecord[]) {
  const dated = records.filter((record) => record.date).slice(0, 6).reverse();
  if (!dated.length) return [{ label: "本週", count: records.length }];
  return dated.map((record) => ({ label: record.date.slice(5).replace("-", "/"), count: 1 }));
}

function uniqueList(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

function formatVisitDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${year}/${month}/${day}`;
}

function exportVisitRecords(records: VisitRecord[]) {
  const header = ["日期", "醫師", "科別", "醫院", "分院", "拜訪狀態", "拜訪時間", "紀錄摘要", "下次提醒"];
  const rows = records.map((record) => [
    record.date || "待安排",
    record.primary?.doctor_name ?? "未對應醫師",
    record.primary?.department ?? "",
    record.primary?.hospital_name ?? "",
    record.primary?.branchLabel ?? "",
    record.note.visitStatus,
    record.visitTime,
    record.note.content,
    record.note.nextReminder
  ]);
  const csv = [header, ...rows].map((row) => row.map(toCsvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "med-link-visit-records.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function toCsvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function visitBadgeClass(status: PersonalNote["visitStatus"]) {
  if (status === "已拜訪") return "rounded-md bg-[#dff7ec] px-2 py-1 text-xs font-black text-[#168a5d]";
  if (status === "需追蹤") return "rounded-md bg-[#fff1e8] px-2 py-1 text-xs font-black text-[#f97316]";
  return "rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-black text-[#075de8]";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
