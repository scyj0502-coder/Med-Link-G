import type { DoctorSchedule } from "../../lib/dashboard";
import { formatDateTime } from "../../lib/dashboard";

export function SourceInfoCard({ item }: { item: DoctorSchedule }) {
  return (
    <section className="rounded-2xl border border-[#dbe5f4] bg-white p-4">
      <h3 className="mb-3 text-base font-black text-[#061b3d]">資料來源</h3>
      <div className="grid gap-3 text-sm">
        <Row label="資料更新時間" value={formatDateTime(item.fetched_at || item.parsed_at)} />
        <Row label="資料發布時間" value={formatDateTime(item.published_at)} />
        <Row label="來源類型" value={item.source_type || "門診資料"} />
        <Row label="來源月份" value={item.source_month || "未標示"} />
        <Row label="資料來源" value={item.source_ref || item.hospital_name} />
      </div>
      {item.originalUrl ? (
        <a className="mt-4 inline-flex rounded-xl border border-[#075de8] px-4 py-2 text-sm font-black text-[#075de8] hover:bg-[#eaf2ff]" href={item.originalUrl} rel="noreferrer" target="_blank">
          查看原始門診表
        </a>
      ) : null}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#eef3fb] pb-2 last:border-0 last:pb-0">
      <strong className="shrink-0 text-[#60708d]">{label}</strong>
      <span className="text-right font-bold text-[#0d2348]">{value}</span>
    </div>
  );
}
