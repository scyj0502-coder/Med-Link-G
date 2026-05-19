import { useState } from "react";
import type { DashboardView } from "./Sidebar";
import { UiIcon, type UiIconName } from "./UiIcon";

type MobileBottomNavProps = {
  activeView: DashboardView;
  onNavigate: (view: DashboardView) => void;
};

const primaryItems: { icon: UiIconName; label: string; view: DashboardView }[] = [
  { icon: "calendar", label: "今日", view: "today" },
  { icon: "search", label: "搜尋", view: "search" },
  { icon: "star", label: "收藏", view: "favorites" },
  { icon: "note", label: "備註", view: "notes" }
];

const moreItems: { icon: UiIconName; label: string; view: DashboardView; description: string }[] = [
  { icon: "history", label: "拜訪紀錄", view: "visits", description: "查看歷史拜訪與追蹤狀態" },
  { icon: "alarm", label: "行程提醒", view: "reminders", description: "安排今日、本週與本月拜訪" },
  { icon: "database", label: "資料來源", view: "sources", description: "確認各醫院門診資料更新狀態" }
];

export function MobileBottomNav({ activeView, onNavigate }: MobileBottomNavProps) {
  const [open, setOpen] = useState(false);
  const moreActive = moreItems.some((item) => item.view === activeView);

  const handleNavigate = (view: DashboardView) => {
    setOpen(false);
    onNavigate(view);
  };

  return (
    <>
      {open ? <div className="fixed inset-0 z-40 bg-[#061b3d]/30 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)} /> : null}

      <div
        className={`fixed inset-x-3 bottom-[86px] z-50 origin-bottom rounded-[22px] border border-[#dbe5f4] bg-white p-3 shadow-[0_18px_50px_rgba(8,35,80,.2)] transition lg:hidden ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <div className="mb-2 flex items-center justify-between px-1">
          <div>
            <h3 className="text-base font-black text-[#061b3d]">更多功能</h3>
            <p className="mt-1 text-xs font-bold text-[#60708d]">管理拜訪、行程與資料來源</p>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-xl border border-[#dbe5f4] text-[#60708d]" onClick={() => setOpen(false)} type="button" aria-label="關閉更多功能">
            x
          </button>
        </div>
        <div className="grid gap-2">
          {moreItems.map((item) => (
            <button
              className={`grid grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-2xl border p-3 text-left ${
                activeView === item.view ? "border-[#075de8] bg-[#eaf2ff]" : "border-[#eef3fb] bg-[#f8fbff]"
              }`}
              key={item.view}
              onClick={() => handleNavigate(item.view)}
              type="button"
            >
              <span className={`grid h-10 w-10 place-items-center rounded-2xl ${activeView === item.view ? "bg-[#075de8] text-white" : "bg-white text-[#075de8]"}`}>
                <UiIcon className="h-5 w-5" name={item.icon} />
              </span>
              <span className="min-w-0">
                <span className="block font-black text-[#061b3d]">{item.label}</span>
                <span className="mt-1 block truncate text-xs font-bold text-[#60708d]">{item.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[76px] w-screen max-w-full grid-cols-5 border-t border-[#dbe5f4] bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_24px_rgba(8,35,80,.08)] lg:hidden">
        {primaryItems.map((item) => (
          <button
            className={`grid min-w-0 place-items-center gap-1 text-xs font-black ${activeView === item.view ? "text-[#075de8]" : "text-[#60708d]"}`}
            key={item.view}
            onClick={() => handleNavigate(item.view)}
            type="button"
          >
            <UiIcon className="h-5 w-5" name={item.icon} />
            <span className="max-w-full truncate text-[11px]">{item.label}</span>
          </button>
        ))}
        <button
          className={`grid min-w-0 place-items-center gap-1 text-xs font-black ${moreActive || open ? "text-[#075de8]" : "text-[#60708d]"}`}
          onClick={() => setOpen((value) => !value)}
          type="button"
          aria-expanded={open}
          aria-label="更多功能"
        >
          <UiIcon className="h-5 w-5" name="menu" />
          <span className="max-w-full truncate text-[11px]">更多</span>
        </button>
      </nav>
    </>
  );
}
