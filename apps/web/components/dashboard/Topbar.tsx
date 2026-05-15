type TopbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenFilters: () => void;
  resultCount: number;
};

export function Topbar({ query, onQueryChange, onOpenFilters, resultCount }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#dbe5f4] bg-white/90 px-4 py-4 backdrop-blur lg:px-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#075de8]">Med-Link</p>
          <h2 className="mt-1 text-2xl font-black text-[#061b3d] lg:text-3xl">今日門診</h2>
          <p className="mt-1 text-sm font-bold text-[#60708d]">目前顯示 {resultCount} 筆可拜訪門診</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex h-11 w-full min-w-0 items-center rounded-xl border border-[#dbe5f4] bg-white px-3 shadow-sm lg:w-[360px]">
            <input
              className="w-full bg-transparent text-[15px] font-semibold text-[#0d2348] outline-none placeholder:text-[#8aa0bf]"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="搜尋醫師 / 科別 / 醫院"
              type="search"
              value={query}
            />
          </label>
          <button
            className="h-11 shrink-0 rounded-xl bg-[#075de8] px-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 lg:hidden"
            onClick={onOpenFilters}
            type="button"
          >
            篩選
          </button>
        </div>
      </div>
    </header>
  );
}
