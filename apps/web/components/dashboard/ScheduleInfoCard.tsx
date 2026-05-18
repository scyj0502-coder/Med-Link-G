import type { DoctorSchedule } from "../../lib/dashboard";

export function ScheduleInfoCard({ item }: { item: DoctorSchedule }) {
  return (
    <section className="rounded-2xl border border-[#dbe5f4] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-[#061b3d]">今日門診資訊</h3>
        <span className="text-xs font-black text-[#60708d]">{item.weekday_label}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="星期" value={item.weekday_label} />
        <Info label="時段" value={item.displayPeriod} strong />
        <Info label="時間" value={`${item.start_time || "未標示"}${item.end_time ? ` - ${item.end_time}` : ""}`} />
        <Info label="診間" value={item.displayRoom} strong />
        <Info label="門診狀態" value={item.status} />
        <Info label="分院" value={item.branchLabel} />
      </div>
      {item.note ? <p className="mt-3 rounded-xl bg-[#fff1e8] px-3 py-2 text-sm font-bold text-[#b45309]">{item.note}</p> : null}
    </section>
  );
}

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-[#f4f8ff] p-3">
      <div className="text-xs font-black text-[#60708d]">{label}</div>
      <div className={`mt-1 ${strong ? "text-lg" : "text-base"} font-black text-[#0d2348]`}>{value}</div>
    </div>
  );
}
