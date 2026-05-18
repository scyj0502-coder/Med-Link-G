import type { DashboardView } from "./Sidebar";
import { UiIcon, type UiIconName } from "./UiIcon";

type MobileBottomNavProps = {
  activeView: DashboardView;
  onNavigate: (view: DashboardView) => void;
};

const items: { icon: UiIconName; label: string; view: DashboardView }[] = [
  { icon: "calendar", label: "今日", view: "today" },
  { icon: "search", label: "搜尋", view: "search" },
  { icon: "star", label: "收藏", view: "favorites" },
  { icon: "note", label: "備註", view: "notes" },
  { icon: "alarm", label: "行程", view: "reminders" }
];

export function MobileBottomNav({ activeView, onNavigate }: MobileBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[76px] grid-cols-5 border-t border-[#dbe5f4] bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_24px_rgba(8,35,80,.08)] lg:hidden">
      {items.map((item) => (
        <button
          className={`grid place-items-center gap-1 text-xs font-black ${activeView === item.view ? "text-[#075de8]" : "text-[#60708d]"}`}
          key={item.view}
          onClick={() => onNavigate(item.view)}
          type="button"
        >
          <UiIcon className="h-5 w-5" name={item.icon} />
          <span className="text-[11px]">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
