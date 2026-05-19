import type { PersonalNote } from "./dashboard";
import { mockPersonalNotes } from "./mockPersonalNotes";
import { createSupabaseBrowserClient } from "./supabase";

const noteStorageKey = "medlink:personal-notes:v1";

type PersonalNoteRow = {
  doctor_key: string;
  content: string | null;
  visit_status: string | null;
  last_visit_date: string | null;
  next_reminder: string | null;
  tags: string[] | null;
};

const visitStatusToDb = {
  "尚未拜訪": "unvisited",
  "已拜訪": "visited",
  "需追蹤": "follow_up"
} as const satisfies Record<PersonalNote["visitStatus"], string>;

const visitStatusFromDb: Record<string, PersonalNote["visitStatus"]> = {
  unvisited: "尚未拜訪",
  visited: "已拜訪",
  follow_up: "需追蹤",
  尚未拜訪: "尚未拜訪",
  已拜訪: "已拜訪",
  需追蹤: "需追蹤"
};

export async function loadPersonalNotes() {
  if (typeof window === "undefined") return mockPersonalNotes;

  try {
    const localNotes = loadLocalPersonalNotes();
    const remoteNotes = await loadRemotePersonalNotes();
    return mergePersonalNotes(mockPersonalNotes, mergePersonalNotes(localNotes, remoteNotes));
  } catch {
    return loadLocalPersonalNotes();
  }
}

export async function savePersonalNote(note: PersonalNote) {
  saveLocalPersonalNotes(upsertPersonalNote(loadLocalPersonalNotes(), note));
  await saveRemotePersonalNote(note);
}

export function loadLocalPersonalNotes() {
  if (typeof window === "undefined") return mockPersonalNotes;

  try {
    return mergePersonalNotes(mockPersonalNotes, parseStoredNotes(localStorage.getItem(noteStorageKey)));
  } catch {
    return mockPersonalNotes;
  }
}

export function saveLocalPersonalNotes(notes: PersonalNote[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(noteStorageKey, JSON.stringify(notes));
  } catch {
    // Keep the in-memory edit even if the browser blocks local storage.
  }
}

async function loadRemotePersonalNotes() {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) return [];

    const { data, error } = await supabase
      .from("personal_notes")
      .select("doctor_key,content,visit_status,last_visit_date,next_reminder,tags")
      .eq("user_id", sessionData.session.user.id);

    if (error || !data) return [];
    return (data as PersonalNoteRow[]).map(rowToPersonalNote).filter(isPersonalNote);
  } catch {
    return [];
  }
}

async function saveRemotePersonalNote(note: PersonalNote) {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (sessionError || !user) return;

    await supabase.from("personal_notes").upsert(
      {
        user_id: user.id,
        doctor_key: note.doctorKey,
        content: note.content,
        visit_status: visitStatusToDb[note.visitStatus],
        last_visit_date: note.lastVisitDate || null,
        next_reminder: note.nextReminder,
        tags: note.tags
      },
      { onConflict: "user_id,doctor_key" }
    );
  } catch {
    // Keep the local copy; remote sync can retry the next time the note is saved.
  }
}

function rowToPersonalNote(row: PersonalNoteRow): PersonalNote {
  return {
    doctorKey: row.doctor_key,
    content: row.content ?? "",
    visitStatus: visitStatusFromDb[row.visit_status ?? ""] ?? "尚未拜訪",
    lastVisitDate: row.last_visit_date ?? "",
    nextReminder: row.next_reminder ?? "",
    tags: row.tags ?? []
  };
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

function upsertPersonalNote(notes: PersonalNote[], note: PersonalNote) {
  const exists = notes.some((item) => item.doctorKey === note.doctorKey);
  return exists ? notes.map((item) => (item.doctorKey === note.doctorKey ? note : item)) : [...notes, note];
}
