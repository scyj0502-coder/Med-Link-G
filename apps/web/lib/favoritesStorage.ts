import { createSupabaseBrowserClient } from "./supabase";

const favoriteStorageKey = "medlink:favorites:v3";

type FavoriteRow = {
  doctor_key: string;
};

export async function loadFavorites() {
  if (typeof window === "undefined") return [];

  try {
    const localFavorites = loadLocalFavorites();
    const remoteFavorites = await loadRemoteFavorites();
    return mergeFavorites(localFavorites, remoteFavorites);
  } catch {
    return loadLocalFavorites();
  }
}

export function loadLocalFavorites() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(favoriteStorageKey) || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function saveFavorite(doctorKey: string, enabled: boolean, allFavorites: string[]) {
  saveLocalFavorites(allFavorites);
  await saveRemoteFavorite(doctorKey, enabled);
}

function saveLocalFavorites(favorites: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(favoriteStorageKey, JSON.stringify(favorites));
  } catch {
    // Keep the in-memory favorite state even if localStorage is blocked.
  }
}

async function loadRemoteFavorites() {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (sessionError || !user) return [];

    const { data, error } = await supabase.from("personal_favorites").select("doctor_key").eq("user_id", user.id);
    if (error || !data) return [];
    return (data as FavoriteRow[]).map((row) => row.doctor_key).filter(Boolean);
  } catch {
    return [];
  }
}

async function saveRemoteFavorite(doctorKey: string, enabled: boolean) {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (sessionError || !user) return;

    if (enabled) {
      await supabase.from("personal_favorites").upsert({ user_id: user.id, doctor_key: doctorKey }, { onConflict: "user_id,doctor_key" });
    } else {
      await supabase.from("personal_favorites").delete().eq("user_id", user.id).eq("doctor_key", doctorKey);
    }
  } catch {
    // Keep local favorite state; remote sync can retry on the next toggle.
  }
}

function mergeFavorites(localFavorites: string[], remoteFavorites: string[]) {
  return Array.from(new Set([...localFavorites, ...remoteFavorites]));
}
