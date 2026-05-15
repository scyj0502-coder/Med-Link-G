import type { DoctorSchedule, PersonalNote } from "../../lib/dashboard";
import { doctorKey } from "../../lib/dashboard";
import { NoteEditForm } from "./NoteEditForm";
import { PersonalNoteCard } from "./PersonalNoteCard";
import { ScheduleInfoCard } from "./ScheduleInfoCard";
import { SourceInfoCard } from "./SourceInfoCard";

type DoctorDetailPanelProps = {
  item: DoctorSchedule | null;
  favorite: boolean;
  note: PersonalNote | null;
  editing: boolean;
  onToggleFavorite: () => void;
  onEditNote: () => void;
  onCancelEdit: () => void;
  onSaveNote: (note: PersonalNote) => void;
};

export function DoctorDetailPanel({
  item,
  favorite,
  note,
  editing,
  onToggleFavorite,
  onEditNote,
  onCancelEdit,
  onSaveNote
}: DoctorDetailPanelProps) {
  if (!item || !note) {
    return (
      <aside className="rounded-[18px] border border-[#dbe5f4] bg-white p-6 text-center shadow-[0_12px_30px_rgba(8,35,80,.08)]">
        <h2 className="text-lg font-black text-[#061b3d]">尚未選擇醫師</h2>
        <p className="mt-2 text-sm font-bold text-[#60708d]">請從今日門診列表選擇一位醫師查看拜訪資訊。</p>
      </aside>
    );
  }

  return (
    <aside className="grid min-w-0 gap-4 rounded-[18px] border border-[#dbe5f4] bg-[#f8fbff] p-4 shadow-[0_12px_30px_rgba(8,35,80,.08)] lg:sticky lg:top-24 lg:self-start">
      <section className="rounded-2xl border border-[#dbe5f4] bg-white p-4">
        <div className="flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[#dbe5f4] bg-[#eef5ff] text-2xl font-black text-[#075de8]">
            {item.doctor_name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-2xl font-black text-[#061b3d]">{item.doctor_name}</h2>
              <span className="font-black text-[#60708d]">醫師</span>
              <button className={`ml-auto text-2xl ${favorite ? "text-[#f7b928]" : "text-[#9bb0cb]"}`} onClick={onToggleFavorite} type="button" aria-label="收藏">
                {favorite ? "★" : "☆"}
              </button>
            </div>
            <p className="mt-1 font-black text-[#075de8]">{item.department}</p>
            <p className="mt-2 text-sm font-bold leading-6 text-[#60708d]">
              {item.hospital_name} <span className="text-[#0d2348]">{item.branchLabel}</span>
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 border-b border-[#dbe5f4] bg-white px-2 text-center text-sm font-black text-[#60708d]">
        <button className="border-b-2 border-[#075de8] py-3 text-[#075de8]" type="button">
          門診資訊
        </button>
        <button className="py-3" type="button">
          醫師資訊
        </button>
        <button className="py-3" type="button">
          備註
        </button>
      </div>

      <ScheduleInfoCard item={item} />
      <SourceInfoCard item={item} />
      {editing ? (
        <NoteEditForm note={note} onCancel={onCancelEdit} onSave={onSaveNote} />
      ) : (
        <PersonalNoteCard note={note} onEdit={onEditNote} />
      )}

      <div className="rounded-2xl border border-[#dbe5f4] bg-white p-3 text-xs font-bold leading-5 text-[#60708d]">
        備註資料鍵值：{doctorKey(item)}
      </div>
    </aside>
  );
}
