export function Sidebar() {
  const items = ["今日門診", "快速搜尋", "我的收藏", "我的備註", "拜訪紀錄", "資料來源"];

  return (
    <aside className="hidden min-h-screen bg-[#061b3d] px-5 py-6 text-white shadow-xl lg:flex lg:flex-col">
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
        {items.map((item, index) => (
          <a
            className={`rounded-xl px-4 py-3 text-[15px] font-bold transition ${index === 0 ? "bg-[#075de8] text-white shadow-lg shadow-blue-900/30" : "text-white/80 hover:bg-white/10"}`}
            href="#"
            key={item}
          >
            {item}
          </a>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#0f73ff] text-xl font-black">業</div>
          <div>
            <strong className="block">業務代表</strong>
            <small className="text-white/70">已登入資料檢視</small>
          </div>
        </div>
        <button className="mt-4 h-10 w-full rounded-xl border border-white/20 text-sm font-bold text-white/85" type="button">
          登出
        </button>
      </div>
    </aside>
  );
}
