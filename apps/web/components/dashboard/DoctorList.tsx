import type { DoctorSchedule } from "../../lib/dashboard";
import { doctorKey } from "../../lib/dashboard";
import { DoctorCard } from "./DoctorCard";
import { UiIcon } from "./UiIcon";

type DoctorListProps = {
  items: DoctorSchedule[];
  selectedKey: string;
  favorites: string[];
  onSelect: (item: DoctorSchedule) => void;
  onToggleFavorite: (item: DoctorSchedule) => void;
};

export function DoctorList({ items, selectedKey, favorites, onSelect, onToggleFavorite }: DoctorListProps) {
  return (
    <section className="grid min-w-0 content-start gap-3" aria-label="今日門診醫師列表">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#061b3d]">今日門診醫師</h2>
          <p className="mt-1 text-sm font-bold text-[#60708d]">共 {items.length} 筆診次</p>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex rounded-xl border border-[#dbe5f4] bg-white p-1 shadow-sm">
            <button className="grid h-9 w-10 place-items-center rounded-lg bg-[#075de8] text-white" type="button" aria-label="卡片檢視">
              <UiIcon className="h-4 w-4" name="calendar" />
            </button>
            <button className="grid h-9 w-10 place-items-center rounded-lg text-[#60708d] hover:bg-[#f4f8ff]" type="button" aria-label="列表檢視">
              <UiIcon className="h-4 w-4" name="menu" />
            </button>
          </div>
          <select className="h-11 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#061b3d] shadow-sm">
            <option>排序：科別</option>
            <option>排序：醫院</option>
            <option>排序：時段</option>
          </select>
        </div>
      </div>

      {items.length ? (
        items.map((item) => (
          <DoctorCard
            active={item.schedule_key === selectedKey}
            favorite={favorites.includes(doctorKey(item))}
            item={item}
            key={item.schedule_key}
            onSelect={() => onSelect(item)}
            onToggleFavorite={() => onToggleFavorite(item)}
          />
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-[#b8c7dd] bg-white p-8 text-center">
          <h3 className="text-lg font-black text-[#061b3d]">目前沒有符合條件的門診</h3>
          <p className="mt-2 text-sm font-bold text-[#60708d]">可清除篩選，或改用醫師姓名、醫院、科別查詢。</p>
        </div>
      )}
    </section>
  );
}
