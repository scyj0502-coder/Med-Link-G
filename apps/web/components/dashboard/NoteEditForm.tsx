import { useState } from "react";
import type { PersonalNote, VisitStage } from "../../lib/dashboard";

type NoteEditFormProps = {
  note: PersonalNote;
  onCancel: () => void;
  onSave: (note: PersonalNote) => void;
};

const visitStatuses: VisitStage[] = ["尚未拜訪", "已拜訪", "需追蹤"];
const suggestedTags = ["重點醫師", "需追蹤", "熟客", "暫緩拜訪"];

export function NoteEditForm({ note, onCancel, onSave }: NoteEditFormProps) {
  const [draft, setDraft] = useState(note);

  function toggleTag(tag: string) {
    setDraft((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag]
    }));
  }

  return (
    <section className="rounded-2xl border border-[#dbe5f4] bg-white p-4">
      <h3 className="text-base font-black text-[#061b3d]">編輯備註</h3>
      <div className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm font-black text-[#061b3d]">
          備註內容
          <textarea
            className="min-h-28 rounded-xl border border-[#dbe5f4] p-3 text-sm font-bold leading-6 outline-none focus:border-[#075de8]"
            onChange={(event) => setDraft({ ...draft, content: event.target.value })}
            placeholder="輸入拜訪前需要知道的重點"
            value={draft.content}
          />
        </label>

        <label className="grid gap-2 text-sm font-black text-[#061b3d]">
          拜訪狀態
          <select className="h-11 rounded-xl border border-[#dbe5f4] px-3 font-bold" onChange={(event) => setDraft({ ...draft, visitStatus: event.target.value as VisitStage })} value={draft.visitStatus}>
            {visitStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-[#061b3d]">
            上次拜訪日期
            <input className="h-11 rounded-xl border border-[#dbe5f4] px-3 font-bold" onChange={(event) => setDraft({ ...draft, lastVisitDate: event.target.value })} type="date" value={draft.lastVisitDate} />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#061b3d]">
            下次提醒
            <input className="h-11 rounded-xl border border-[#dbe5f4] px-3 font-bold" onChange={(event) => setDraft({ ...draft, nextReminder: event.target.value })} placeholder="例：下週二上午前確認" value={draft.nextReminder} />
          </label>
        </div>

        <div>
          <div className="mb-2 text-sm font-black text-[#061b3d]">標籤</div>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag) => (
              <button className={`rounded-full px-3 py-2 text-sm font-black ${draft.tags.includes(tag) ? "bg-[#075de8] text-white" : "bg-[#eaf2ff] text-[#0d2348]"}`} key={tag} onClick={() => toggleTag(tag)} type="button">
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button className="h-11 rounded-xl border border-[#dbe5f4] font-black text-[#075de8]" onClick={onCancel} type="button">
            取消
          </button>
          <button className="h-11 rounded-xl bg-[#075de8] font-black text-white" onClick={() => onSave(draft)} type="button">
            儲存備註
          </button>
        </div>
      </div>
    </section>
  );
}
