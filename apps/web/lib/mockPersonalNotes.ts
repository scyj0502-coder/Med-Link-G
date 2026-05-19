import type { PersonalNote } from "./dashboard";

export const mockPersonalNotes: PersonalNote[] = [
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
