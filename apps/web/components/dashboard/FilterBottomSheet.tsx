import type { Hospital } from "../../lib/types";
import type { FilterState } from "../../lib/dashboard";
import { periodOptions, weekdayOptions } from "../../lib/dashboard";

type FilterBottomSheetProps = {
  open: boolean;
  filters: FilterState;
  hospitals: Hospital[];
  regions: string[];
  branches: string[];
  departments: string[];
  doctors: string[];
  onChange: (patch: Partial<FilterState>) => void;
  onClose: () => void;
  onClear: () => void;
};

export function FilterBottomSheet({
  open,
  filters,
  hospitals,
  regions,
  branches,
  departments,
  doctors,
  onChange,
  onClose,
  onClear
}: FilterBottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#050c1c]/70 lg:hidden">
      <section className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[22px] bg-white shadow-2xl">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#dbe5f4] px-5">
          <h2 className="text-lg font-black text-[#061b3d]">篩選條件</h2>
          <button className="grid h-9 w-9 place-items-center rounded-xl bg-[#f4f8ff] text-xl font-black text-[#0d2348]" onClick={onClose} type="button">
            x
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4">
          <ChipGroup label="地區" value={filters.region} options={regions} onChange={(value) => onChange({ region: value, hospitalId: "", branchName: "" })} />
          <MobileSelect label="醫院" value={filters.hospitalId} options={hospitals.map((item) => ({ value: item.id, label: item.hospital_name }))} emptyLabel="全部醫院" onChange={(value) => onChange({ hospitalId: value, branchName: "" })} />
          <MobileSelect label="分院" value={filters.branchName} options={branches} emptyLabel="全部分院" onChange={(value) => onChange({ branchName: value })} />
          <MobileSelect label="科別" value={filters.department} options={departments} emptyLabel="全部科別" onChange={(value) => onChange({ department: value, doctorName: "" })} />
          <MobileSelect label="醫師姓名" value={filters.doctorName} options={doctors} emptyLabel="全部醫師" onChange={(value) => onChange({ doctorName: value })} />
          <MobileSelect label="星期" value={filters.weekday} options={weekdayOptions} emptyLabel="全部星期" onChange={(value) => onChange({ weekday: value })} />
          <ChipGroup label="時段" value={filters.period} options={periodOptions} onChange={(value) => onChange({ period: value })} />
          <label className="mt-5 flex items-center justify-between rounded-2xl border border-[#dbe5f4] p-4 text-sm font-black text-[#0d2348]">
            只看收藏
            <input checked={filters.favoritesOnly} onChange={(event) => onChange({ favoritesOnly: event.target.checked })} type="checkbox" />
          </label>
        </div>

        <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-[#dbe5f4] p-4">
          <button className="h-12 rounded-xl border border-[#dbe5f4] font-black text-[#075de8]" onClick={onClear} type="button">
            清除篩選
          </button>
          <button className="h-12 rounded-xl bg-[#075de8] font-black text-white" onClick={onClose} type="button">
            套用篩選
          </button>
        </footer>
      </section>
    </div>
  );
}

function ChipGroup({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <section className="mb-5">
      <h3 className="mb-3 text-sm font-black text-[#061b3d]">{label}</h3>
      <div className="flex flex-wrap gap-2">
        <button className={chipClass(value === "")} onClick={() => onChange("")} type="button">全部</button>
        {options.map((option) => (
          <button className={chipClass(value === option)} key={option} onClick={() => onChange(option)} type="button">
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}

function MobileSelect({
  label,
  value,
  options,
  emptyLabel,
  onChange
}: {
  label: string;
  value: string;
  options: string[] | { value: string; label: string }[];
  emptyLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mb-5 grid gap-2 text-sm font-black text-[#061b3d]">
      {label}
      <select className="h-12 rounded-xl border border-[#dbe5f4] bg-white px-3 font-bold text-[#0d2348]" onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    </label>
  );
}

function chipClass(active: boolean) {
  return `rounded-full px-4 py-2 text-sm font-black ${active ? "bg-[#075de8] text-white" : "bg-[#eaf2ff] text-[#0d2348]"}`;
}
