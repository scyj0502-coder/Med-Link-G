import type { DoctorSchedule, PersonalNote } from "../../lib/dashboard";
import { doctorKey } from "../../lib/dashboard";

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

type DoctorGroup = {
  key: string;
  primary: DoctorSchedule;
  schedules: DoctorSchedule[];
  note?: PersonalNote;
};

export function FavoriteDoctorsView({ items, notes, favorites, query, onOpenSchedule, onToggleFavorite, onGoSearch }: FavoriteDoctorsViewProps) {
  const noteMap = new Map(notes.map((note) => [note.doctorKey, note]));
  const normalizedQuery = normalize(query);
  const groups = groupDoctors(items)
    .filter((group) => favorites.includes(group.key))
    .map((group) => ({ ...group, note: noteMap.get(group.key) }))
    .filter((group) => matchesDoctorGroup(group, normalizedQuery));

  if (!groups.length) {
    return (
      <EmptySavedState
        title={favorites.length ? "目前條件沒有收藏醫師" : "尚未收藏醫師"}
        description={favorites.length ? "可以清空搜尋字或改用醫師、科別、醫院名稱查找。" : "從今日門診或快速搜尋把常拜訪醫師加入收藏，就會集中在這裡。"}
        actionLabel="前往快速搜尋"
        onAction={onGoSearch}
      />
    );
  }

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-[#061b3d]">我的收藏</h2>
        <p className="mt-2 text-sm font-bold text-[#60708d]">集中管理重點醫師，拜訪前快速確認門診、診間與個人備註。</p>
      </div>
      <div className="grid gap-3">
        {groups.map((group) => (
          <SavedDoctorCard
            favorite
            group={group}
            key={group.key}
            onOpenSchedule={() => onOpenSchedule(group.primary)}
            onToggleFavorite={() => onToggleFavorite(group.primary)}
          />
        ))}
      </div>
    </section>
  );
}

export function NotesView({ items, notes, favorites, query, onOpenSchedule, onToggleFavorite, onGoSearch }: NotesViewProps) {
  const scheduleMap = new Map<string, DoctorSchedule[]>();
  for (const item of items) {
    const key = doctorKey(item);
    scheduleMap.set(key, [...(scheduleMap.get(key) ?? []), item]);
  }
  const normalizedQuery = normalize(query);
  const rows = notes
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

  if (!rows.length) {
    return (
      <EmptySavedState
        title={notes.length ? "目前條件沒有備註" : "尚未建立個人備註"}
        description={notes.length ? "可以清空搜尋字，或改用標籤、拜訪狀態、醫師姓名查找。" : "在醫師詳細資料中建立拜訪狀態、提醒與標籤後，會集中在這裡。"}
        actionLabel="前往快速搜尋"
        onAction={onGoSearch}
      />
    );
  }

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black text-[#061b3d]">我的備註</h2>
        <p className="mt-2 text-sm font-bold text-[#60708d]">整理每位醫師的拜訪狀態、下次提醒與標籤，方便上班途中快速回看。</p>
      </div>
      <div className="grid gap-3">
        {rows.map((row) => (
          <article className="rounded-2xl border border-[#dbe5f4] bg-white p-4 shadow-[0_8px_18px_rgba(8,35,80,.055)]" key={row.note.doctorKey}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-black text-[#061b3d]">{row.primary?.doctor_name ?? "未對應醫師"}</h3>
                  {row.primary ? <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-black text-[#075de8]">{row.primary.department}</span> : null}
                  <span className={visitBadgeClass(row.note.visitStatus)}>{row.note.visitStatus}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-[#60708d]">
                  {row.primary ? `${row.primary.hospital_name} ${row.primary.branchLabel}` : row.note.doctorKey}
                </p>
                <p className="mt-3 rounded-xl bg-[#f4f8ff] p-3 text-sm font-bold leading-6 text-[#0d2348]">{row.note.content || "尚未填寫備註內容"}</p>
                <div className="mt-3 grid gap-2 text-sm font-bold text-[#60708d] sm:grid-cols-2">
                  <span>上次拜訪：{row.note.lastVisitDate || "未標示"}</span>
                  <span>下次提醒：{row.note.nextReminder || "未設定"}</span>
                </div>
                {row.note.tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.note.tags.map((tag) => (
                      <span className="rounded-lg bg-[#eaf2ff] px-3 py-2 text-xs font-black text-[#075de8]" key={tag}>{tag}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 lg:w-28 lg:grid-cols-1">
                {row.primary ? <ActionButton label="查看門診" onClick={() => onOpenSchedule(row.primary)} /> : null}
                {row.primary ? <ActionButton label={row.favorite ? "取消收藏" : "加入收藏"} onClick={() => onToggleFavorite(row.primary)} secondary /> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SavedDoctorCard({
  group,
  favorite,
  onOpenSchedule,
  onToggleFavorite
}: {
  group: DoctorGroup;
  favorite: boolean;
  onOpenSchedule: () => void;
  onToggleFavorite: () => void;
}) {
  const visibleSchedules = group.schedules.slice(0, 4);

  return (
    <article className="rounded-2xl border border-[#dbe5f4] bg-white p-4 shadow-[0_8px_18px_rgba(8,35,80,.055)]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
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
              </div>
              <p className="mt-1 text-sm font-bold text-[#60708d]">
                {group.primary.hospital_name} <span className="text-[#0d2348]">{group.primary.branchLabel}</span>
              </p>
            </div>
          </div>
          {group.note?.content ? <p className="mt-3 rounded-xl bg-[#f4f8ff] p-3 text-sm font-bold leading-6 text-[#0d2348]">備註：{group.note.content}</p> : null}
          {group.note?.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {group.note.tags.map((tag) => <span className="rounded-lg bg-[#eaf2ff] px-3 py-2 text-xs font-black text-[#075de8]" key={tag}>{tag}</span>)}
            </div>
          ) : null}
        </div>
        <div className="grid gap-2">
          {visibleSchedules.map((item) => (
            <button className="rounded-xl border border-[#dbe5f4] bg-[#f8fbff] px-3 py-2 text-left text-sm font-black text-[#0d2348]" key={item.schedule_key} onClick={onOpenSchedule} type="button">
              <span className="mr-2 rounded-md bg-[#075de8] px-2 py-1 text-xs text-white">{item.displayPeriod}</span>
              {item.weekday_label}｜{item.displayRoom}
            </button>
          ))}
          <ActionButton label="查看門診" onClick={onOpenSchedule} />
        </div>
      </div>
    </article>
  );
}

function EmptySavedState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <section className="rounded-[18px] border border-dashed border-[#b8c7dd] bg-white p-8 text-center shadow-[0_12px_30px_rgba(8,35,80,.08)]">
      <h2 className="text-2xl font-black text-[#061b3d]">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-6 text-[#60708d]">{description}</p>
      <button className="mt-5 h-11 rounded-xl bg-[#075de8] px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20" onClick={onAction} type="button">
        {actionLabel}
      </button>
    </section>
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

function matchesNoteRow(row: { note: PersonalNote; primary?: DoctorSchedule; schedules: DoctorSchedule[] }, query: string) {
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

function visitBadgeClass(status: PersonalNote["visitStatus"]) {
  if (status === "已拜訪") return "rounded-md bg-[#dff7ec] px-2 py-1 text-xs font-black text-[#168a5d]";
  if (status === "需追蹤") return "rounded-md bg-[#fff1e8] px-2 py-1 text-xs font-black text-[#f97316]";
  return "rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-black text-[#075de8]";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
