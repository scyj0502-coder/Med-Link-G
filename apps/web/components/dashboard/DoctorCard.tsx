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
      className={`grid min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-3 overflow-hidden rounded-2xl border bg-white p-4 shadow-[0_8px_18px_rgba(8,35,80,.055)] transition hover:-translate-y-0.5 hover:shadow-lg md:grid-cols-[32px_58px_minmax(190px,1fr)_1px_minmax(220px,260px)_112px_72px] md:items-center md:gap-3 2xl:grid-cols-[32px_64px_minmax(240px,1fr)_1px_270px_120px_76px] ${active ? "border-[#075de8] shadow-blue-600/10 ring-2 ring-[#075de8]/10" : "border-[#dbe5f4]"}`}
    >
      <button
        aria-label={favorite ? "取消收藏" : "收藏"}
        className={`grid h-9 w-9 place-items-center rounded-xl text-xl leading-none transition ${favorite ? "bg-[#fff7d6] text-[#f7b928]" : "bg-[#f4f8ff] text-[#9bb0cb] hover:text-[#f7b928]"}`}
        onClick={onToggleFavorite}
        type="button"
      >
        {favorite ? "★" : "☆"}
      </button>

      <div className="hidden h-14 w-14 place-items-center rounded-full border border-[#dbe5f4] bg-[#eef5ff] text-xl font-black text-[#075de8] md:grid 2xl:h-16 2xl:w-16">
        {item.doctor_name.slice(0, 1)}
      </div>

      <button className="min-w-0 text-left" onClick={onSelect} type="button">
        <div className="flex flex-wrap items-baseline gap-2">
          <strong className="text-xl font-black text-[#061b3d]">{item.doctor_name}</strong>
          <span className="text-sm font-black text-[#60708d]">醫師</span>
        </div>
        <div className="mt-1 inline-flex rounded-md bg-[#eaf2ff] px-2 py-0.5 text-sm font-black text-[#075de8]">{item.department}</div>
        <div className="mt-2 line-clamp-2 text-sm font-bold text-[#60708d]">
          {item.hospital_name} <span className="text-[#0d2348]">{item.branchLabel}</span>
        </div>
      </button>

      <div className="hidden h-16 w-px bg-[#dbe5f4] md:block" />

      <button className="col-span-2 grid gap-2 rounded-xl bg-[#f8fbff] p-3 text-left md:col-span-1 md:bg-transparent md:p-0" onClick={onSelect} type="button">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-[#075de8] px-3 py-1 text-sm font-black text-white">{item.displayPeriod}</span>
          <span className="text-sm font-black text-[#60708d]">{item.weekday_label}</span>
          <span className="text-sm font-bold text-[#60708d]">
            {item.start_time || "未標示"}{item.end_time ? ` - ${item.end_time}` : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-base font-black text-[#0d2348]">
          <span className="text-xs font-black text-[#60708d]">診間</span>
          <span>{item.displayRoom.replace("診間 ", "")}</span>
        </div>
      </button>

      <span className={`col-start-2 justify-self-start whitespace-nowrap rounded-full px-3 py-2 text-center text-xs font-black md:col-start-auto md:inline-block ${statusClassName(item.status)}`}>
        {item.status}
      </span>

      <button className="col-start-2 justify-self-start rounded-xl border border-[#075de8] px-4 py-2 text-sm font-black text-[#075de8] hover:bg-[#eaf2ff] md:col-start-auto md:justify-self-stretch" onClick={onSelect} type="button">
        詳細
      </button>
    </article>
  );
}

function statusClassName(status: DoctorSchedule["status"]) {
  if (status === "正常開診") return "bg-[#dff7ec] text-[#168a5d]";
  if (status === "停診") return "bg-red-50 text-red-600";
  return "bg-[#fff1e8] text-[#f97316]";
}
