import type { PersonalNote } from "../../lib/dashboard";

type PersonalNoteCardProps = {
  note: PersonalNote;
  onEdit: () => void;
};

export function PersonalNoteCard({ note, onEdit }: PersonalNoteCardProps) {
  return (
    <section className="rounded-2xl border border-[#dbe5f4] bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-[#061b3d]">我的備註</h3>
          <p className="mt-1 text-xs font-bold text-[#60708d]">登入後只顯示自己的拜訪資料與提醒。</p>
        </div>
        <button className="rounded-xl bg-[#eaf2ff] px-3 py-2 text-sm font-black text-[#075de8] hover:bg-[#dbe9ff]" onClick={onEdit} type="button">
          編輯備註
        </button>
      </div>

      <p className="min-h-12 rounded-xl bg-[#f4f8ff] p-3 text-sm font-bold leading-6 text-[#0d2348]">
        {note.content || "尚未建立備註。"}
      </p>

      <div className="mt-3 grid gap-2 text-sm">
        <Row label="拜訪狀態" value={note.visitStatus} />
        <Row label="上次拜訪" value={note.lastVisitDate || "未記錄"} />
        <Row label="下次提醒" value={note.nextReminder || "未設定"} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {note.tags.length ? note.tags.map((tag) => <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black text-[#075de8]" key={tag}>{tag}</span>) : <span className="text-sm font-bold text-[#60708d]">尚未設定標籤</span>}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <strong className="text-[#60708d]">{label}</strong>
      <span className="text-right font-black text-[#0d2348]">{value}</span>
    </div>
  );
}
