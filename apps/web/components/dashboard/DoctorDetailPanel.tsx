import type { DoctorSchedule, PersonalNote } from "../../lib/dashboard";
import { NoteEditForm } from "./NoteEditForm";
import { PersonalNoteCard } from "./PersonalNoteCard";
import { ScheduleInfoCard } from "./ScheduleInfoCard";
import { SourceInfoCard } from "./SourceInfoCard";
import { UiIcon } from "./UiIcon";

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
        <h2 className="text-lg font-black text-[#061b3d]">選擇一位醫師</h2>
        <p className="mt-2 text-sm font-bold text-[#60708d]">請從今日門診列表選擇醫師，查看門診、來源與個人備註。</p>
      </aside>
    );
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.hospital_name} ${item.branchLabel}`)}`;

  return (
    <aside className="grid min-w-0 gap-4 rounded-[18px] border border-[#dbe5f4] bg-[#f8fbff] p-4 shadow-[0_12px_30px_rgba(8,35,80,.08)] lg:sticky lg:top-24 lg:self-start">
      <section className="rounded-2xl border border-[#dbe5f4] bg-white p-4">
        <div className="flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[#dbe5f4] bg-[#eef5ff] text-2xl font-black text-[#075de8]">
            {item.doctor_name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="text-2xl font-black text-[#061b3d]">{item.doctor_name}</h2>
                  <span className="font-black text-[#60708d]">醫師</span>
                </div>
                <p className="mt-1 font-black text-[#075de8]">{item.department}</p>
              </div>
              <button className={`ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-xl ${favorite ? "bg-[#fff7d6] text-[#f7b928]" : "bg-[#f4f8ff] text-[#9bb0cb]"}`} onClick={onToggleFavorite} type="button" aria-label={favorite ? "取消收藏" : "收藏"}>
                {favorite ? "★" : "☆"}
              </button>
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-[#60708d]">
              {item.hospital_name} <span className="text-[#0d2348]">{item.branchLabel}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClassName(item.status)}`}>{item.status}</span>
              <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black text-[#075de8]">{item.displayPeriod}</span>
              <span className="rounded-full bg-[#f4f8ff] px-3 py-1 text-xs font-black text-[#60708d]">{item.displayRoom}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a className="rounded-xl border border-[#075de8] px-3 py-2 text-center text-sm font-black text-[#075de8] hover:bg-[#eaf2ff]" href={mapsUrl} rel="noreferrer" target="_blank">
            導航
          </a>
          {item.originalUrl ? (
            <a className="rounded-xl bg-[#075de8] px-3 py-2 text-center text-sm font-black text-white hover:bg-[#064fca]" href={item.originalUrl} rel="noreferrer" target="_blank">
              原始門診表
            </a>
          ) : (
            <button className="rounded-xl bg-[#eef3fb] px-3 py-2 text-sm font-black text-[#60708d]" type="button" disabled>
              原始門診表
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-[#dbe5f4] bg-white p-1 text-center text-sm font-black text-[#60708d]">
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#eaf2ff] py-3 text-[#075de8]" type="button">
          <UiIcon className="h-4 w-4" name="calendar" />
          門診資訊
        </button>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl py-3 hover:bg-[#f4f8ff]" type="button">
          <UiIcon className="h-4 w-4" name="search" />
          醫師資訊
        </button>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl py-3 hover:bg-[#f4f8ff]" type="button">
          <UiIcon className="h-4 w-4" name="note" />
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
    </aside>
  );
}

function statusClassName(status: DoctorSchedule["status"]) {
  if (status === "正常開診") return "bg-[#dff7ec] text-[#168a5d]";
  if (status === "停診") return "bg-red-50 text-red-600";
  return "bg-[#fff1e8] text-[#f97316]";
}
