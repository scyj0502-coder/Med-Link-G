import { useState } from "react";
import type { ReactNode } from "react";
import type { DoctorSchedule, PersonalNote } from "../../lib/dashboard";
import { doctorKey } from "../../lib/dashboard";
import { UiIcon, type UiIconName } from "./UiIcon";

type ReminderScope = "today" | "week" | "month" | "all";
type ReminderStatus = "已完成" | "待拜訪" | "即將開始" | "已取消";

type ScheduleReminderViewProps = {
  items: DoctorSchedule[];
  notes: PersonalNote[];
  query: string;
  onOpenSchedule: (item: DoctorSchedule) => void;
  onOpenNote: (item: DoctorSchedule) => void;
};

type ReminderItem = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ReminderStatus;
  reminder: string;
  schedule: DoctorSchedule;
  note?: PersonalNote;
};

type ReminderStat = {
  label: string;
  value: number;
  suffix: string;
  hint: string;
  icon: UiIconName;
  tone: "blue" | "green" | "orange" | "purple";
};

const scopeTabs: { value: ReminderScope; label: string }[] = [
  { value: "today", label: "今日" },
  { value: "week", label: "本週" },
  { value: "month", label: "本月" },
  { value: "all", label: "全部" }
];

const statusStyles: Record<ReminderStatus, string> = {
  已完成: "bg-[#dff7ec] text-[#168a5d]",
  待拜訪: "bg-[#fff1e8] text-[#f97316]",
  即將開始: "bg-[#ffe8e8] text-[#dc2626]",
  已取消: "bg-[#eef2f8] text-[#60708d]"
};

export function ScheduleReminderView({ items, notes, query, onOpenSchedule, onOpenNote }: ScheduleReminderViewProps) {
  const [scope, setScope] = useState<ReminderScope>("today");
  const today = new Date();
  const todayKey = formatDateKey(today);
  const allReminders = buildReminderItems(items, notes, today).filter((item) => matchesReminder(item, query));
  const reminders = filterByScope(allReminders, scope, today);
  const todayItems = filterByScope(allReminders, "today", today);
  const weekItems = filterByScope(allReminders, "week", today);
  const upcoming = allReminders.filter((item) => item.date >= todayKey && item.status !== "已完成" && item.status !== "已取消").slice(0, 5);
  const stats: ReminderStat[] = [
    { label: "今日行程", value: todayItems.length, suffix: "件", hint: `已完成 ${todayItems.filter((item) => item.status === "已完成").length} 件`, icon: "calendar", tone: "blue" },
    { label: "待拜訪", value: reminders.filter((item) => item.status === "待拜訪").length, suffix: "件", hint: `即將到來 ${upcoming.length} 件`, icon: "history", tone: "orange" },
    { label: "本週行程", value: weekItems.length, suffix: "件", hint: `已完成 ${weekItems.filter((item) => item.status === "已完成").length} 件`, icon: "calendar", tone: "green" },
    { label: "下次提醒", value: allReminders.filter((item) => item.note?.nextReminder).length, suffix: "件", hint: upcoming[0]?.date ? `最早 ${formatShortDate(upcoming[0].date)}` : "尚未設定", icon: "alarm", tone: "purple" }
  ];

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#061b3d]">行程提醒</h2>
          <p className="mt-2 text-sm font-bold text-[#60708d]">業務拜訪行程管理中心，重點是安排拜訪順序、掌握下一步行動，月曆只作為輔助檢視。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="h-10 rounded-xl bg-[#075de8] px-4 text-sm font-black text-white shadow-lg shadow-blue-600/20" type="button">新增行程</button>
          <button className="h-10 rounded-xl border border-[#b8c7dd] bg-white px-4 text-sm font-black text-[#075de8]" type="button">同步行事曆</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {scopeTabs.map((tab) => (
          <button
            className={`h-10 shrink-0 rounded-xl border px-5 text-sm font-black transition ${
              scope === tab.value ? "border-[#075de8] bg-[#075de8] text-white shadow-lg shadow-blue-600/20" : "border-[#b8c7dd] bg-white text-[#0d2348] hover:border-[#075de8]"
            }`}
            key={tab.value}
            onClick={() => setScope(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <ReminderStatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-black text-[#061b3d]">{scopeTitle(scope)}</h3>
            <span className="text-sm font-bold text-[#60708d]">共 {reminders.length} 件</span>
          </div>
          {reminders.length ? (
            <div className="relative grid gap-3 pl-16 before:absolute before:left-[38px] before:top-3 before:h-[calc(100%-24px)] before:w-px before:bg-[#cfe0f4]">
              {reminders.map((item) => (
                <ScheduleReminderCard
                  item={item}
                  key={item.id}
                  onOpenNote={() => onOpenNote(item.schedule)}
                  onOpenSchedule={() => onOpenSchedule(item.schedule)}
                />
              ))}
            </div>
          ) : (
            <section className="rounded-[18px] border border-dashed border-[#b8c7dd] bg-white p-8 text-center shadow-[0_12px_30px_rgba(8,35,80,.08)]">
              <h3 className="text-xl font-black text-[#061b3d]">目前沒有行程</h3>
              <p className="mt-2 text-sm font-bold text-[#60708d]">可以切換今日、本週、本月或全部拜訪行程查看。</p>
            </section>
          )}
        </div>

        <ScheduleReminderSidePanel reminders={allReminders} today={today} upcoming={upcoming} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ShortcutCard title="快速新增行程" description="從醫師門診或備註建立拜訪安排，補上提醒與任務。" />
        <ShortcutCard title="同步行事曆" description="預留 Google / Outlook 行事曆同步入口，避免重複安排。" />
        <ShortcutCard title="行程提醒設定" description="之後可設定提醒時間、提醒方式與預設拜訪準備清單。" />
      </div>
    </section>
  );
}

function ScheduleReminderCard({
  item,
  onOpenSchedule,
  onOpenNote
}: {
  item: ReminderItem;
  onOpenSchedule: () => void;
  onOpenNote: () => void;
}) {
  return (
    <article className="relative rounded-2xl border border-[#dbe5f4] bg-white p-4 shadow-[0_8px_18px_rgba(8,35,80,.055)]">
      <div className="absolute -left-16 top-5 w-12 text-right">
        <div className="text-[11px] font-black text-[#60708d]">拜訪時間</div>
        <div className="font-black text-[#061b3d]">{item.startTime}</div>
        <div className="text-sm font-bold text-[#60708d]">{item.endTime}</div>
      </div>
      <div className={`absolute -left-[34px] top-7 h-4 w-4 rounded-full ring-4 ring-[#eaf2ff] ${item.status === "已完成" ? "bg-[#18a66a]" : item.status === "即將開始" ? "bg-[#ef4444]" : "bg-[#f59e0b]"}`} />
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(230px,0.9fr)_150px] 2xl:items-center">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#dbe5f4] bg-[#eef5ff] text-xl font-black text-[#075de8]">
              {item.schedule.doctor_name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="grid gap-3">
                <FieldLine label="醫師姓名" value={`${item.schedule.doctor_name} 醫師`} strong />
                <div className="grid gap-2 md:grid-cols-2">
                  <FieldLine label="科別" value={item.schedule.department} />
                  <FieldLine label="醫院／分院" value={`${item.schedule.hospital_name} ${item.schedule.branchLabel}`} />
                  <FieldLine label="門診時段" value={`${item.schedule.displayPeriod} ${item.schedule.start_time || "時間未標示"}-${item.schedule.end_time || "未標示"}`} />
                  <FieldLine label="診間" value={item.schedule.displayRoom} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-[#dbe5f4] bg-[#f8fbff] p-3 text-sm font-bold text-[#60708d]">
          <div>
            <span className="mb-2 block text-xs font-black text-[#60708d]">行程狀態</span>
            <span className={statusBadgeClass(item.status)}>{item.status}</span>
          </div>
          <div>
            <span className="block text-xs font-black text-[#60708d]">下一步行動</span>
            <span className="font-black text-[#0d2348]">{item.reminder}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 2xl:grid-cols-1">
          <button className="h-10 rounded-xl border border-[#075de8] bg-white px-3 text-sm font-black text-[#075de8]" onClick={onOpenNote} type="button">查看備註</button>
          <button className="h-10 rounded-xl border border-[#075de8] bg-white px-3 text-sm font-black text-[#075de8]" onClick={onOpenSchedule} type="button">檢視門診</button>
        </div>
      </div>
    </article>
  );
}

function ScheduleReminderSidePanel({ reminders, today, upcoming }: { reminders: ReminderItem[]; today: Date; upcoming: ReminderItem[] }) {
  const priorityItems = [...upcoming].sort((a, b) => priorityScore(b) - priorityScore(a)).slice(0, 5);
  const todayDay = today.getDate();

  return (
    <aside className="grid content-start gap-4">
      <SideCard title="拜訪優先順序">
        <div className="grid gap-3">
          {priorityItems.length ? priorityItems.map((item, index) => (
            <div className="grid grid-cols-[28px_1fr] gap-3 rounded-xl bg-[#f8fbff] p-3" key={item.id}>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#075de8] text-xs font-black text-white">{index + 1}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-[#061b3d]">{item.schedule.doctor_name} 醫師</span>
                  <span className={statusBadgeClass(item.status)}>{item.status}</span>
                </div>
                <div className="mt-1 text-xs font-bold leading-5 text-[#60708d]">{formatShortDate(item.date)} {item.startTime} | {item.schedule.displayRoom}</div>
                <div className="mt-1 text-xs font-black leading-5 text-[#0d2348]">下一步：{item.reminder}</div>
              </div>
            </div>
          )) : <p className="text-sm font-bold leading-6 text-[#60708d]">目前沒有需要排序的拜訪行程。</p>}
        </div>
      </SideCard>

      <SideCard title="即將到來的行程">
        <div className="grid gap-3">
          {upcoming.length ? upcoming.map((item) => (
            <div className="grid grid-cols-[72px_1fr] gap-3 rounded-xl bg-[#f8fbff] p-3" key={item.id}>
              <div className="text-sm font-black text-[#075de8]">{formatShortDate(item.date)} {item.startTime}</div>
              <div className="min-w-0">
                <div className="font-black text-[#061b3d]">{item.schedule.doctor_name} 醫師</div>
                <div className="mt-1 text-xs font-bold text-[#60708d]">下一步：{item.reminder}</div>
              </div>
            </div>
          )) : <p className="text-sm font-bold leading-6 text-[#60708d]">目前沒有即將到來的行程。</p>}
        </div>
      </SideCard>

      <SideCard title="輔助月曆視圖">
        <div className="mb-3 flex items-center justify-between">
          <strong className="text-[#061b3d]">{formatMonthLabel(today)}</strong>
          <span className="text-sm font-black text-[#075de8]">本月</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-[#60708d]">
          {["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}
          {buildCalendarDays(today).map((day) => (
            <span className={`grid h-8 place-items-center rounded-lg ${day === todayDay ? "bg-[#075de8] text-white" : reminders.some((item) => item.date.slice(0, 7) === formatMonthKey(today) && Number(item.date.slice(-2)) === day) ? "bg-[#eaf2ff] text-[#075de8]" : "text-[#0d2348]"}`} key={day}>
              {day}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs font-bold leading-5 text-[#60708d]">月曆用來辨識哪幾天有行程，實際拜訪順序以上方優先順序為主。</p>
      </SideCard>

      <SideCard title="行程狀態說明">
        <div className="grid gap-3 text-sm font-bold text-[#60708d]">
          {(["已完成", "待拜訪", "即將開始", "已取消"] as ReminderStatus[]).map((status) => (
            <div className="flex items-center justify-between gap-3" key={status}>
              <span className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${statusDotClass(status)}`} />
                <span>{status}</span>
              </span>
              <span className="font-black text-[#061b3d]">{reminders.filter((item) => item.status === status).length} 件</span>
            </div>
          ))}
        </div>
      </SideCard>
    </aside>
  );
}

function ReminderStatCard({ label, value, suffix, hint, icon, tone }: ReminderStat) {
  const toneClass = {
    blue: "bg-[#eaf2ff] text-[#075de8]",
    green: "bg-[#dff7ec] text-[#168a5d]",
    orange: "bg-[#fff1e8] text-[#f97316]",
    purple: "bg-[#f0eaff] text-[#7c3aed]"
  }[tone];

  return (
    <section className="rounded-[18px] border border-[#dbe5f4] bg-white p-4 shadow-[0_12px_30px_rgba(8,35,80,.08)] sm:p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl sm:h-12 sm:w-12 ${toneClass}`}>
          <UiIcon className="h-5 w-5" name={icon} />
        </span>
        <div>
          <div className="text-sm font-black text-[#60708d]">{label}</div>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-2xl font-black text-[#061b3d] sm:text-3xl">{value}</span>
            <span className="pb-1 text-sm font-black text-[#60708d]">{suffix}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs font-black text-[#168a5d]">{hint}</div>
    </section>
  );
}

function FieldLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-black text-[#60708d]">{label}</div>
      <div className={`${strong ? "text-xl" : "text-sm"} truncate font-black text-[#061b3d]`}>{value}</div>
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

function ShortcutCard({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-[18px] border border-[#dbe5f4] bg-white p-5 shadow-[0_12px_30px_rgba(8,35,80,.08)]">
      <h3 className="font-black text-[#061b3d]">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-[#60708d]">{description}</p>
    </section>
  );
}

function buildReminderItems(items: DoctorSchedule[], notes: PersonalNote[], referenceDate: Date) {
  const noteMap = new Map(notes.map((note) => [note.doctorKey, note]));
  const today = referenceDate.getDay();
  const todayItems = items.filter((item) => item.weekday === today);
  const sourceItems = todayItems.length ? todayItems : items;

  return sourceItems.slice(0, 8).map((schedule, index) => {
    const note = noteMap.get(doctorKey(schedule));
    const status: ReminderStatus = index === 0 ? "已完成" : index === 4 ? "即將開始" : index === 7 ? "已取消" : "待拜訪";
    const startTime = schedule.start_time || fallbackStartTime(index);
    return {
      id: `${schedule.schedule_key}-${index}`,
      date: formatDateKey(addDays(referenceDate, index < 5 ? 0 : index + 1)),
      startTime,
      endTime: schedule.end_time || fallbackEndTime(startTime),
      status,
      reminder: note?.nextReminder || defaultReminder(index),
      schedule,
      note
    };
  });
}

function filterByScope(items: ReminderItem[], scope: ReminderScope, referenceDate: Date) {
  const today = formatDateKey(referenceDate);
  if (scope === "all") return items;
  if (scope === "today") return items.filter((item) => item.date === today);
  if (scope === "week") return items.filter((item) => item.date >= today && item.date <= formatDateKey(addDays(referenceDate, 7)));
  return items.filter((item) => item.date.startsWith(formatMonthKey(referenceDate)));
}

function matchesReminder(item: ReminderItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [
    item.schedule.doctor_name,
    item.schedule.department,
    item.schedule.hospital_name,
    item.schedule.branch_name,
    item.schedule.displayRoom,
    item.reminder,
    item.note?.content ?? ""
  ].join(" ").toLowerCase().includes(normalizedQuery);
}

function statusBadgeClass(status: ReminderStatus) {
  return `rounded-md px-2 py-1 text-xs font-black ${statusStyles[status]}`;
}

function statusDotClass(status: ReminderStatus) {
  if (status === "已完成") return "bg-[#18a66a]";
  if (status === "即將開始") return "bg-[#ef4444]";
  if (status === "已取消") return "bg-[#94a3b8]";
  return "bg-[#f59e0b]";
}

function priorityScore(item: ReminderItem) {
  const statusWeight: Record<ReminderStatus, number> = {
    即將開始: 40,
    待拜訪: 30,
    已完成: 10,
    已取消: 0
  };
  const reminderWeight = item.note?.nextReminder ? 8 : 0;
  const dateWeight = item.date === "2026-05-16" ? 12 : 0;
  return statusWeight[item.status] + reminderWeight + dateWeight;
}

function scopeTitle(scope: ReminderScope) {
  if (scope === "week") return "本週拜訪行程";
  if (scope === "month") return "本月拜訪行程";
  if (scope === "all") return "全部拜訪行程";
  return "今日拜訪行程";
}

function fallbackStartTime(index: number) {
  return ["08:30", "10:30", "14:00", "16:00", "16:30", "09:30", "15:30", "18:30"][index] ?? "09:00";
}

function fallbackEndTime(startTime: string) {
  const [hour, minute] = startTime.split(":").map(Number);
  return `${String(Math.min(hour + 1, 23)).padStart(2, "0")}:${String(minute || 0).padStart(2, "0")}`;
}

function defaultReminder(index: number) {
  return ["提供新產品資料，拜訪前確認門診動線。", "週二上午比較方便，避免在門診一開始打擾。", "櫃台表示週五下午較方便，會再確認時間。", "帶新品資料，針對臨床應用重點說明。", "晚上診，注意避開晚間尖峰時段。"][index] ?? "拜訪前確認醫師門診與停診資訊。";
}

function formatShortDate(value: string) {
  return value.slice(5).replace("-", "/");
}

function buildCalendarDays(date: Date) {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => index + 1);
}

function formatMonthLabel(date: Date) {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
