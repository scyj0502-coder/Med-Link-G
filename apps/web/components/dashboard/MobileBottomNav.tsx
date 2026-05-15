export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[76px] grid-cols-5 border-t border-[#dbe5f4] bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_24px_rgba(8,35,80,.08)] lg:hidden">
      {["今日", "搜尋", "收藏", "備註", "我的"].map((item, index) => (
        <a
          className={`grid place-items-center text-xs font-black ${index === 0 ? "text-[#075de8]" : "text-[#60708d]"}`}
          href="#"
          key={item}
        >
          <span className="text-[11px]">{item}</span>
        </a>
      ))}
    </nav>
  );
}
