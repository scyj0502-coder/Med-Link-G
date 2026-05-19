import { UiIcon, type UiIconName } from "./UiIcon";

export type DashboardView = "today" | "search" | "favorites" | "notes" | "visits" | "reminders" | "sources" | "account";

type SidebarProps = {
  activeView: DashboardView;
  onNavigate: (view: DashboardView) => void;
};

const items: { icon: UiIconName; label: string; view: DashboardView }[] = [
  { icon: "calendar", label: "今日門診", view: "today" },
  { icon: "search", label: "快速搜尋", view: "search" },
  { icon: "star", label: "我的收藏", view: "favorites" },
  { icon: "note", label: "我的備註", view: "notes" },
  { icon: "history", label: "拜訪紀錄", view: "visits" },
  { icon: "alarm", label: "行程提醒", view: "reminders" },
  { icon: "database", label: "資料來源", view: "sources" },
  { icon: "user", label: "帳號設定", view: "account" }
];

export function Sidebar({ activeView, onNavigate }: SidebarProps) {

  return (
    <aside className="hidden min-h-screen bg-[#061b3d] px-4 py-6 text-white shadow-xl lg:flex lg:flex-col">
      <div className="mb-9 flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-gradient-to-br from-[#0f73ff] to-[#22d3ee] text-3xl font-black shadow-lg shadow-blue-600/30">
          +
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-wide">醫點通</h1>
          <p className="mt-1 text-sm font-semibold text-white/70">業務拜訪好幫手</p>
        </div>
      </div>

      <nav className="grid gap-2">
        {items.map((item) => (
          <button
            className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] font-bold transition ${
              activeView === item.view ? "bg-[#075de8] text-white shadow-lg shadow-blue-900/30" : "text-white/80 hover:bg-white/10"
            }`}
            key={item.view}
            onClick={() => onNavigate(item.view)}
            type="button"
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${activeView === item.view ? "bg-white/15" : "bg-white/5 text-white/75 group-hover:bg-white/10"}`}>
              <UiIcon className="h-5 w-5" name={item.icon} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#0f73ff] text-xl font-black">業</div>
          <div>
            <strong className="block">業務代表</strong>
            <small className="text-white/70">個人資料同步</small>
          </div>
        </div>
        <button className="mt-4 h-10 w-full rounded-xl border border-white/20 text-sm font-bold text-white/85" onClick={() => onNavigate("account")} type="button">
          帳號設定
        </button>
      </div>
    </aside>
  );
}
