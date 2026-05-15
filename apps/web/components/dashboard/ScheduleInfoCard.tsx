import type { DoctorSchedule } from "../../lib/dashboard";

export function ScheduleInfoCard({ item }: { item: DoctorSchedule }) {
  return (
    <section className="rounded-2xl border border-[#dbe5f4] bg-white p-4">
      <h3 className="mb-3 text-base font-black text-[#061b3d]">今日門診資訊</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="星期" value={item.weekday_label} />
        <Info label="時段" value={item.displayPeriod} strong />
        <Info label="診間" value={item.displayRoom} strong />
        <Info label="門診狀態" value={item.status} />
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
