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
        <button className="hidden h-10 w-10 place-items-center rounded-xl text-2xl font-black text-[#061b3d] hover:bg-[#f4f8ff] lg:grid" type="button" aria-label="收合導覽">
          ≡
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
            <span className="ml-2 text-xl font-black text-[#061b3d]">⌕</span>
          </label>
          <button className="hidden rounded-xl px-3 py-2 text-sm font-black text-[#061b3d] hover:bg-[#f4f8ff] md:inline-flex" type="button">
            通知
          </button>
          <button className="hidden rounded-xl px-3 py-2 text-sm font-black text-[#061b3d] hover:bg-[#f4f8ff] md:inline-flex" type="button">
            說明
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
          <span className="text-sm font-bold text-[#60708d]">資料更新：2026/05/15 18:30</span>
          <span className="text-sm font-bold text-[#60708d]">目前 {resultCount} 筆</span>
        </div>
      </div>
    </header>
  );
}
