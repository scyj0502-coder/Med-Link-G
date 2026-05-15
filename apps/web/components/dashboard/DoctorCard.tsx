import type { DoctorSchedule } from "../../lib/dashboard";

type DoctorCardProps = {
  item: DoctorSchedule;
  active: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
};

export function DoctorCard({ item, active, favorite, onSelect, onToggleFavorite }: DoctorCardProps) {
  return (
    <article
      className={`grid grid-cols-[28px_1fr_24px] gap-3 rounded-2xl border bg-white p-4 shadow-[0_8px_18px_rgba(8,35,80,.055)] transition hover:-translate-y-0.5 hover:shadow-lg md:grid-cols-[32px_64px_minmax(220px,1fr)_230px_118px_28px] md:items-center md:gap-4 ${active ? "border-[#075de8] shadow-blue-600/10" : "border-[#dbe5f4]"}`}
    >
      <button aria-label={favorite ? "取消收藏" : "收藏"} className={`text-2xl leading-none ${favorite ? "text-[#f7b928]" : "text-[#9bb0cb]"}`} onClick={onToggleFavorite} type="button">
        {favorite ? "★" : "☆"}
      </button>

      <div className="hidden h-16 w-16 place-items-center rounded-full border border-[#dbe5f4] bg-[#eef5ff] text-xl font-black text-[#075de8] md:grid">
        {item.doctor_name.slice(0, 1)}
      </div>

      <button className="min-w-0 text-left" onClick={onSelect} type="button">
        <div className="flex flex-wrap items-baseline gap-2">
          <strong className="text-xl font-black text-[#061b3d]">{item.doctor_name}</strong>
          <span className="text-sm font-black text-[#60708d]">醫師</span>
        </div>
        <div className="mt-1 text-sm font-black text-[#075de8]">{item.department}</div>
        <div className="mt-1 line-clamp-2 text-sm font-bold text-[#60708d]">
          {item.hospital_name} <span className="text-[#0d2348]">{item.branchLabel}</span>
        </div>
      </button>

      <button className="col-span-2 grid gap-2 text-left md:col-span-1" onClick={onSelect} type="button">
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#60708d]">
          <span className="rounded-full bg-[#eaf2ff] px-3 py-1 font-black text-[#075de8]">{item.displayPeriod}</span>
          <span>{item.weekday_label}</span>
        </div>
        <div className="text-base font-black text-[#0d2348]">{item.displayRoom}</div>
      </button>

      <span className={`hidden rounded-full px-3 py-2 text-center text-xs font-black md:inline-block ${item.status === "正常開診" ? "bg-[#dff7ec] text-[#168a5d]" : item.status === "停診" ? "bg-red-50 text-red-600" : "bg-[#fff1e8] text-[#f97316]"}`}>
        {item.status}
      </span>

      <button className="text-2xl font-black text-[#075de8]" onClick={onSelect} type="button" aria-label="詳細資料">
        ›
      </button>
    </article>
  );
}
