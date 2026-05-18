import { UiIcon } from "./UiIcon";

type TopbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenFilters: () => void;
  resultCount: number;
  title?: string;
  subtitle?: string;
  showFilterButton?: boolean;
};

export function Topbar({ query, onQueryChange, onOpenFilters, resultCount, title = "今日門診", subtitle, showFilterButton = true }: TopbarProps) {
  const today = new Date();
  const dateText = today.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  });

  return (
    <header className="sticky top-0 z-30 border-b border-[#dbe5f4] bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-7">
        <button className="hidden h-10 w-10 place-items-center rounded-xl text-[#061b3d] hover:bg-[#f4f8ff] lg:grid" type="button" aria-label="收合導覽">
          <UiIcon className="h-5 w-5" name="menu" />
        </button>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3">
          <label className="hidden h-11 w-full max-w-[360px] items-center rounded-xl border border-[#dbe5f4] bg-white px-3 shadow-sm md:flex">
            <input
              className="w-full bg-transparent text-[15px] font-semibold text-[#0d2348] outline-none placeholder:text-[#8aa0bf]"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="搜尋醫師、科別、醫院..."
              type="search"
              value={query}
            />
            <UiIcon className="ml-2 h-5 w-5 text-[#061b3d]" name="search" />
          </label>
          <button className="relative hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-black text-[#061b3d] hover:bg-[#f4f8ff] md:inline-flex" type="button">
            <UiIcon className="h-5 w-5" name="bell" />
            <span>通知</span>
            <span className="absolute -right-1 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[#ef4444] px-1 text-[11px] font-black text-white">3</span>
          </button>
          <button className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-black text-[#061b3d] hover:bg-[#f4f8ff] md:inline-flex" type="button">
            <UiIcon className="h-5 w-5" name="help" />
            <span>說明</span>
          </button>
          <button
            className={`h-11 shrink-0 rounded-xl bg-[#075de8] px-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 lg:hidden ${showFilterButton ? "" : "hidden"}`}
            onClick={onOpenFilters}
            type="button"
          >
            篩選
          </button>
        </div>
      </div>

      <div className="px-4 pb-5 lg:px-7">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
          <h2 className="text-3xl font-black tracking-tight text-[#061b3d]">{title}</h2>
          {subtitle ? <span className="text-sm font-bold text-[#60708d]">{subtitle}</span> : <span className="text-base font-black text-[#061b3d]">{dateText}</span>}
          <span className="inline-flex items-center gap-1 text-sm font-bold text-[#60708d]">
            資料更新：2026/05/15 18:30
            <UiIcon className="h-4 w-4 text-[#075de8]" name="refresh" />
          </span>
          <span className="text-sm font-bold text-[#60708d]">目前 {resultCount} 筆</span>
        </div>
      </div>
    </header>
  );
}
