import type { PersonalNote } from "./dashboard";
import { mockPersonalNotes } from "./mockPersonalNotes";

const noteStorageKey = "medlink:personal-notes:v1";

export function loadPersonalNotes() {
  if (typeof window === "undefined") return mockPersonalNotes;

  try {
    return mergePersonalNotes(mockPersonalNotes, parseStoredNotes(localStorage.getItem(noteStorageKey)));
  } catch {
    return mockPersonalNotes;
  }
}

export function savePersonalNotes(notes: PersonalNote[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(noteStorageKey, JSON.stringify(notes));
  } catch {
    // Keep the in-memory edit even if the browser blocks local storage.
  }
}

function parseStoredNotes(value: string | null): PersonalNote[] {
  if (!value) return [];
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isPersonalNote);
}

function isPersonalNote(value: unknown): value is PersonalNote {
  if (!value || typeof value !== "object") return false;
  const note = value as Partial<PersonalNote>;
  return (
    typeof note.doctorKey === "string" &&
    typeof note.content === "string" &&
    typeof note.visitStatus === "string" &&
    typeof note.lastVisitDate === "string" &&
    typeof note.nextReminder === "string" &&
    Array.isArray(note.tags) &&
    note.tags.every((tag) => typeof tag === "string")
  );
}

function mergePersonalNotes(defaultNotes: PersonalNote[], storedNotes: PersonalNote[]) {
  const map = new Map(defaultNotes.map((note) => [note.doctorKey, note]));
  for (const note of storedNotes) {
    map.set(note.doctorKey, note);
  }
  return Array.from(map.values());
}
