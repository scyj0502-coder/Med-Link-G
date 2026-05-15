import type { PersonalNote } from "./dashboard";

export const mockPersonalNotes: PersonalNote[] = [
  {
    doctorKey: "kmugh|心臟血管內科|吳韋聰",
    content: "重點拜訪醫師，偏好下午診前簡短說明，先備好資料重點。",
    visitStatus: "需追蹤",
    lastVisitDate: "2026-05-08",
    nextReminder: "下次拜訪前一天確認是否停診",
    tags: ["重點醫師", "需追蹤"]
  },
  {
    doctorKey: "ptvgh|心臟內科|蔡孟翰",
    content: "屏東榮總新來源驗證名單，拜訪前優先確認原始 PDF。",
    visitStatus: "尚未拜訪",
    lastVisitDate: "",
    nextReminder: "週一上午先查門診表",
    tags: ["新來源", "需追蹤"]
  }
];

export function defaultPersonalNote(doctorKey: string): PersonalNote {
  return {
    doctorKey,
    content: "",
    visitStatus: "尚未拜訪",
    lastVisitDate: "",
    nextReminder: "",
    tags: []
  };
}
