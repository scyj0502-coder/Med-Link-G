import type { Hospital } from "../../lib/types";
import type { FilterState } from "../../lib/dashboard";
import { filterChips, periodOptions, weekdayOptions } from "../../lib/dashboard";

type FilterPanelProps = {
  filters: FilterState;
  hospitals: Hospital[];
  regions: string[];
  branches: string[];
  departments: string[];
  doctors: string[];
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
};

export function FilterPanel({
  filters,
  hospitals,
  regions,
  branches,
  departments,
  doctors,
  onChange,
  onClear
}: FilterPanelProps) {
  const chips = filterChips(filters, hospitals);

  return (
    <section className="hidden rounded-[18px] border border-[#dbe5f4] bg-white p-5 shadow-[0_12px_30px_rgba(8,35,80,.08)] lg:block">
      <div className="grid grid-cols-[repeat(4,minmax(120px,1fr))_auto] gap-4 xl:grid-cols-[repeat(8,minmax(110px,1fr))]">
        <SelectField label="地區" value={filters.region} onChange={(value) => onChange({ region: value, hospitalId: "", branchName: "" })} options={regions} emptyLabel="全部地區" />
        <SelectField label="醫院" value={filters.hospitalId} onChange={(value) => onChange({ hospitalId: value, branchName: "" })} options={hospitals.map((item) => ({ value: item.id, label: item.hospital_name }))} emptyLabel="全部醫院" />
        <SelectField label="分院" value={filters.branchName} onChange={(value) => onChange({ branchName: value })} options={branches} emptyLabel="全部分院" />
        <SelectField label="科別" value={filters.department} onChange={(value) => onChange({ department: value, doctorName: "" })} options={departments} emptyLabel="全部科別" />
        <SelectField label="醫師姓名" value={filters.doctorName} onChange={(value) => onChange({ doctorName: value })} options={doctors} emptyLabel="全部醫師" />
        <SelectField label="星期" value={filters.weekday} onChange={(value) => onChange({ weekday: value })} options={weekdayOptions} emptyLabel="全部星期" />
        <SelectField label="時段" value={filters.period} onChange={(value) => onChange({ period: value })} options={periodOptions} emptyLabel="全部時段" />
        <label className="flex h-[70px] items-end">
          <span className="flex h-11 items-center gap-2 rounded-xl border border-[#dbe5f4] px-3 text-sm font-black text-[#0d2348]">
            <input checked={filters.favoritesOnly} onChange={(event) => onChange({ favoritesOnly: event.target.checked })} type="checkbox" />
            只看收藏
          </span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#eef3fb] pt-4">
        <span className="text-sm font-black text-[#061b3d]">目前篩選條件：</span>
        {chips.length ? chips.map((chip) => <span className="rounded-xl bg-[#eaf2ff] px-3 py-2 text-xs font-black text-[#075de8]" key={chip}>{chip}</span>) : <span className="text-sm font-bold text-[#60708d]">尚未套用篩選</span>}
        <div className="ml-auto flex gap-3">
          <button className="h-10 rounded-xl border border-[#c9d7ea] px-6 text-sm font-black text-[#061b3d]" onClick={onClear} type="button">
            重設
          </button>
          <button className="h-10 rounded-xl bg-[#075de8] px-6 text-sm font-black text-white shadow-lg shadow-blue-600/20" type="button">
            套用篩選
          </button>
        </div>
      </div>
    </section>
  );
}

function SelectField({
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
    <label className="grid gap-2 text-sm font-black text-[#0d2348]">
      {label}
      <select
        className="h-11 min-w-0 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-bold outline-none focus:border-[#075de8]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    </label>
  );
}
