import type { DashboardView } from "./Sidebar";

type MobileBottomNavProps = {
  activeView: DashboardView;
  onNavigate: (view: DashboardView) => void;
};

const items: { label: string; view: DashboardView }[] = [
  { label: "今日", view: "today" },
  { label: "搜尋", view: "search" },
  { label: "收藏", view: "favorites" },
  { label: "備註", view: "notes" },
  { label: "我的", view: "visits" }
];

export function MobileBottomNav({ activeView, onNavigate }: MobileBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[76px] grid-cols-5 border-t border-[#dbe5f4] bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_24px_rgba(8,35,80,.08)] lg:hidden">
      {items.map((item) => (
        <button
          className={`grid place-items-center text-xs font-black ${activeView === item.view ? "text-[#075de8]" : "text-[#60708d]"}`}
          key={item.view}
          onClick={() => onNavigate(item.view)}
          type="button"
        >
          <span className="text-[11px]">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
