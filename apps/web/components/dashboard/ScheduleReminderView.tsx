import { useState } from "react";
import type { ReactNode } from "react";
import type { DoctorSchedule, PersonalNote } from "../../lib/dashboard";
import { doctorKey } from "../../lib/dashboard";

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
  const allReminders = buildReminderItems(items, notes).filter((item) => matchesReminder(item, query));
  const reminders = filterByScope(allReminders, scope);
  const todayItems = filterByScope(allReminders, "today");
  const weekItems = filterByScope(allReminders, "week");
  const upcoming = allReminders.filter((item) => item.status !== "已完成").slice(0, 5);
  const stats = [
    { label: "今日行程", value: todayItems.length, suffix: "件", hint: `已完成 ${todayItems.filter((item) => item.status === "已完成").length} 件` },
    { label: "待拜訪", value: reminders.filter((item) => item.status === "待拜訪").length, suffix: "件", hint: `即將到來 ${upcoming.length} 件` },
    { label: "本週行程", value: weekItems.length, suffix: "件", hint: `已完成 ${weekItems.filter((item) => item.status === "已完成").length} 件` },
    { label: "下次提醒", value: allReminders.filter((item) => item.note?.nextReminder).length, suffix: "件", hint: upcoming[0]?.date ? `最早 ${formatShortDate(upcoming[0].date)}` : "尚未設定" }
  ];

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#061b3d]">行程提醒</h2>
          <p className="mt-2 text-sm font-bold text-[#60708d]">業務拜訪行程管理中心，掌握今天要去哪裡、什麼時間拜訪與下一步提醒。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="h-10 rounded-xl bg-[#075de8] px-4 text-sm font-black text-white shadow-lg shadow-blue-600/20" type="button">新增行程</button>
          <button className="h-10 rounded-xl border border-[#b8c7dd] bg-white px-4 text-sm font-black text-[#075de8]" type="button">同步行事曆</button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
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
          <section className="rounded-[18px] border border-[#dbe5f4] bg-white p-5 shadow-[0_12px_30px_rgba(8,35,80,.08)]" key={stat.label}>
            <div className="text-sm font-black text-[#60708d]">{stat.label}</div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-black text-[#061b3d]">{stat.value}</span>
              <span className="pb-1 text-sm font-black text-[#60708d]">{stat.suffix}</span>
            </div>
            <div className="mt-2 text-xs font-black text-[#168a5d]">{stat.hint}</div>
          </section>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-black text-[#061b3d]">{scopeLabel(scope)}行程</h3>
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
              <p className="mt-2 text-sm font-bold text-[#60708d]">可以切換今日、本週、本月或全部查看。</p>
            </section>
          )}
        </div>

        <ScheduleReminderSidePanel reminders={allReminders} upcoming={upcoming} />
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
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black text-[#061b3d]">{item.schedule.doctor_name}</h3>
                <span className="text-sm font-black text-[#60708d]">醫師</span>
                <span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-xs font-black text-[#075de8]">{item.schedule.department}</span>
              </div>
              <p className="mt-1 text-sm font-bold text-[#60708d]">{item.schedule.hospital_name} {item.schedule.branchLabel}</p>
              <p className="mt-2 text-sm font-bold text-[#0d2348]">
                今日門診：{item.schedule.displayPeriod} {item.schedule.start_time || "時間未標示"}-{item.schedule.end_time || "未標示"} | {item.schedule.displayRoom}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-[#dbe5f4] bg-[#f8fbff] p-3 text-sm font-bold text-[#60708d]">
          <div>
            <span className={statusBadgeClass(item.status)}>{item.status}</span>
          </div>
          <div>
            <span className="block text-xs font-black text-[#60708d]">拜訪提醒</span>
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

function ScheduleReminderSidePanel({ reminders, upcoming }: { reminders: ReminderItem[]; upcoming: ReminderItem[] }) {
  return (
    <aside className="grid content-start gap-4">
      <SideCard title="即將到來">
        <div className="grid gap-3">
          {upcoming.length ? upcoming.map((item) => (
            <div className="grid grid-cols-[72px_1fr] gap-3 rounded-xl bg-[#f8fbff] p-3" key={item.id}>
              <div className="text-sm font-black text-[#075de8]">{formatShortDate(item.date)} {item.startTime}</div>
              <div className="min-w-0">
                <div className="font-black text-[#061b3d]">{item.schedule.doctor_name} 醫師</div>
                <div className="mt-1 text-xs font-bold text-[#60708d]">{item.reminder}</div>
              </div>
            </div>
          )) : <p className="text-sm font-bold leading-6 text-[#60708d]">目前沒有即將到來的行程。</p>}
        </div>
      </SideCard>

      <SideCard title="行事曆">
        <div className="mb-3 flex items-center justify-between">
          <strong className="text-[#061b3d]">2026 年 5 月</strong>
          <span className="text-sm font-black text-[#075de8]">本月</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-[#60708d]">
          {["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}
          {buildCalendarDays().map((day) => (
            <span className={`grid h-8 place-items-center rounded-lg ${day === 16 ? "bg-[#075de8] text-white" : reminders.some((item) => Number(item.date.slice(-2)) === day) ? "bg-[#eaf2ff] text-[#075de8]" : "text-[#0d2348]"}`} key={day}>
              {day}
            </span>
          ))}
        </div>
      </SideCard>

      <SideCard title="行程狀態說明">
        <div className="grid gap-3 text-sm font-bold text-[#60708d]">
          {(["已完成", "待拜訪", "即將開始", "已取消"] as ReminderStatus[]).map((status) => (
            <div className="flex items-center gap-2" key={status}>
              <span className={`h-3 w-3 rounded-full ${statusStyles[status].split(" ")[0]}`} />
              <span>{status}</span>
            </div>
          ))}
        </div>
      </SideCard>
    </aside>
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

function buildReminderItems(items: DoctorSchedule[], notes: PersonalNote[]) {
  const noteMap = new Map(notes.map((note) => [note.doctorKey, note]));
  const today = new Date().getDay();
  const todayItems = items.filter((item) => item.weekday === today);
  const sourceItems = todayItems.length ? todayItems : items;

  return sourceItems.slice(0, 8).map((schedule, index) => {
    const note = noteMap.get(doctorKey(schedule));
    const status: ReminderStatus = index === 0 ? "已完成" : index === 4 ? "即將開始" : "待拜訪";
    const startTime = schedule.start_time || fallbackStartTime(index);
    return {
      id: `${schedule.schedule_key}-${index}`,
      date: index < 5 ? "2026-05-16" : `2026-05-${String(20 + index).padStart(2, "0")}`,
      startTime,
      endTime: schedule.end_time || fallbackEndTime(startTime),
      status,
      reminder: note?.nextReminder || defaultReminder(index),
      schedule,
      note
    };
  });
}

function filterByScope(items: ReminderItem[], scope: ReminderScope) {
  if (scope === "all") return items;
  if (scope === "today") return items.filter((item) => item.date === "2026-05-16");
  if (scope === "week") return items.filter((item) => item.date >= "2026-05-16" && item.date <= "2026-05-23");
  return items.filter((item) => item.date.startsWith("2026-05"));
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

function scopeLabel(scope: ReminderScope) {
  if (scope === "week") return "本週";
  if (scope === "month") return "本月";
  if (scope === "all") return "全部";
  return "今日";
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

function buildCalendarDays() {
  return Array.from({ length: 35 }, (_, index) => index + 1).filter((day) => day <= 31);
}
