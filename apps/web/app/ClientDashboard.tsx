"use client";

import { useEffect, useMemo, useState } from "react";
import { AccountSettingsView } from "../components/dashboard/AccountSettingsView";
import { DataSourcesView } from "../components/dashboard/DataSourcesView";
import { DoctorDetailPanel } from "../components/dashboard/DoctorDetailPanel";
import { DoctorList } from "../components/dashboard/DoctorList";
import { FilterBottomSheet } from "../components/dashboard/FilterBottomSheet";
import { FilterPanel } from "../components/dashboard/FilterPanel";
import { MobileBottomNav } from "../components/dashboard/MobileBottomNav";
import { ScheduleReminderView } from "../components/dashboard/ScheduleReminderView";
import { FavoriteDoctorsView, NotesView, VisitHistoryView } from "../components/dashboard/SavedViews";
import { SearchCenter } from "../components/dashboard/SearchCenter";
import { Sidebar } from "../components/dashboard/Sidebar";
import type { DashboardView } from "../components/dashboard/Sidebar";
import { Topbar } from "../components/dashboard/Topbar";
import {
  buildDoctorSchedules,
  doctorKey,
  emptyFilters,
  filterChips,
  filterSchedules,
  uniqueSorted,
  type DoctorSchedule,
  type FilterState,
  type PersonalNote
} from "../lib/dashboard";
import { defaultPersonalNote, mockPersonalNotes } from "../lib/mockPersonalNotes";
import { loadLocalPersonalNotes, loadPersonalNotes, savePersonalNote } from "../lib/personalNotesStorage";
import type { Hospital, PublishedSchedule } from "../lib/types";

const favoriteStorageKey = "medlink:favorites:v3";

type ClientDashboardProps = {
  hospitals: Hospital[];
  schedules: PublishedSchedule[];
  initialFilters: {
    q: string;
    region?: string;
    hospital?: string;
    branch?: string;
    department: string;
    doctor: string;
    weekday?: string;
    period?: string;
    favoritesOnly?: string;
  };
  initialView?: DashboardView;
};

export default function ClientDashboard({ hospitals, schedules, initialFilters, initialView = "today" }: ClientDashboardProps) {
  const [filters, setFilters] = useState<FilterState>({
    ...emptyFilters,
    query: initialFilters.q,
    region: initialFilters.region ?? "",
    hospitalId: initialFilters.hospital ?? "",
    branchName: initialFilters.branch ?? "",
    department: initialFilters.department,
    doctorName: initialFilters.doctor,
    weekday: initialFilters.weekday ?? "",
    period: initialFilters.period ?? "",
    favoritesOnly: initialFilters.favoritesOnly === "1"
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>(mockPersonalNotes);
  const [selectedKey, setSelectedKey] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeView, setActiveView] = useState<DashboardView>(initialView);

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem(favoriteStorageKey) || "[]"));
    } catch {
      setFavorites([]);
    }

    setNotes(loadLocalPersonalNotes());
    void loadPersonalNotes().then(setNotes);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setParam = (key: string, value: string) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    };

    setParam("view", activeView === "today" ? "" : activeView);
    setParam("q", filters.query);
    setParam("region", filters.region);
    setParam("hospital", filters.hospitalId);
    setParam("branch", filters.branchName);
    setParam("department", filters.department);
    setParam("doctor", filters.doctorName);
    setParam("weekday", filters.weekday);
    setParam("period", filters.period);
    setParam("favoritesOnly", filters.favoritesOnly ? "1" : "");

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [
    activeView,
    filters.branchName,
    filters.department,
    filters.doctorName,
    filters.favoritesOnly,
    filters.hospitalId,
    filters.period,
    filters.query,
    filters.region,
    filters.weekday
  ]);

  const doctorSchedules = useMemo(() => buildDoctorSchedules(schedules, hospitals), [hospitals, schedules]);

  const filterOptions = useMemo(() => {
    const scoped = doctorSchedules.filter((item) => {
      const regionOk = !filters.region || item.region === filters.region;
      const hospitalOk = !filters.hospitalId || item.hospital_id === filters.hospitalId;
      const branchOk = !filters.branchName || item.branch_name === filters.branchName;
      const departmentOk = !filters.department || item.department === filters.department;
      return regionOk && hospitalOk && branchOk && departmentOk;
    });

    return {
      regions: uniqueSorted(hospitals.map((item) => item.region)),
      hospitals: hospitals.filter((item) => !filters.region || item.region === filters.region),
      branches: uniqueSorted(scoped.map((item) => item.branch_name)),
      departments: uniqueSorted(scoped.map((item) => item.department)),
      doctors: uniqueSorted(scoped.map((item) => item.doctor_name))
    };
  }, [doctorSchedules, filters.branchName, filters.department, filters.hospitalId, filters.region, hospitals]);

  const filteredSchedules = useMemo(
    () => filterSchedules(doctorSchedules, filters, favorites),
    [doctorSchedules, favorites, filters]
  );

  const selectedItem = useMemo(() => {
    return filteredSchedules.find((item) => item.schedule_key === selectedKey) ?? filteredSchedules[0] ?? doctorSchedules[0] ?? null;
  }, [doctorSchedules, filteredSchedules, selectedKey]);

  const selectedDoctorKey = selectedItem ? doctorKey(selectedItem) : "";
  const selectedNote = selectedDoctorKey
    ? notes.find((item) => item.doctorKey === selectedDoctorKey) ?? defaultPersonalNote(selectedDoctorKey)
    : null;
  const chips = filterChips(filters, hospitals);
  const favoriteDoctorCount = useMemo(() => {
    return new Set(doctorSchedules.filter((item) => favorites.includes(doctorKey(item))).map((item) => doctorKey(item))).size;
  }, [doctorSchedules, favorites]);
  const viewMeta = {
    today: { title: "今日門診", subtitle: undefined, count: filteredSchedules.length },
    search: { title: "快速搜尋", subtitle: "全站搜尋中心", count: doctorSchedules.length },
    favorites: { title: "我的收藏", subtitle: "重點醫師追蹤", count: favoriteDoctorCount },
    notes: { title: "我的備註", subtitle: "個人拜訪資訊", count: notes.length },
    visits: { title: "拜訪紀錄", subtitle: "歷史拜訪與追蹤時間軸", count: notes.length },
    reminders: { title: "行程提醒", subtitle: "業務拜訪行程管理中心", count: doctorSchedules.length },
    sources: { title: "資料來源", subtitle: "門診來源管理", count: hospitals.length },
    account: { title: "帳號設定", subtitle: "個人資料同步", count: notes.length }
  }[activeView];

  useEffect(() => {
    if (selectedItem && selectedItem.schedule_key !== selectedKey) {
      setSelectedKey(selectedItem.schedule_key);
      setEditingNote(false);
    }
  }, [selectedItem, selectedKey]);

  function updateFilters(patch: Partial<FilterState>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function clearFilters() {
    setFilters(emptyFilters);
  }

  function toggleFavorite(item: DoctorSchedule) {
    const key = doctorKey(item);
    const next = favorites.includes(key) ? favorites.filter((value) => value !== key) : [...favorites, key];
    setFavorites(next);
    localStorage.setItem(favoriteStorageKey, JSON.stringify(next));
  }

  function saveNote(nextNote: PersonalNote) {
    setNotes((current) => {
      const exists = current.some((item) => item.doctorKey === nextNote.doctorKey);
      const next = exists ? current.map((item) => (item.doctorKey === nextNote.doctorKey ? nextNote : item)) : [...current, nextNote];
      void savePersonalNote(nextNote);
      return next;
    });
    setEditingNote(false);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f8ff] text-[#0d2348]">
      <div className="grid min-h-screen lg:grid-cols-[268px_1fr]">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <div className="min-w-0 pb-24 lg:pb-0">
          <Topbar
            query={filters.query}
            resultCount={viewMeta.count}
            showFilterButton={activeView === "today"}
            subtitle={viewMeta.subtitle}
            title={viewMeta.title}
            onOpenFilters={() => setFiltersOpen(true)}
            onQueryChange={(query) => updateFilters({ query })}
          />

          <section className="grid min-w-0 gap-5 px-3 py-4 sm:px-4 lg:px-7 lg:py-6">
            {activeView === "today" ? (
              <FilterPanel
                branches={filterOptions.branches}
                departments={filterOptions.departments}
                doctors={filterOptions.doctors}
                filters={filters}
                hospitals={filterOptions.hospitals}
                regions={filterOptions.regions}
                onChange={updateFilters}
                onClear={clearFilters}
              />
            ) : null}

            {activeView === "today" ? <div className="flex flex-wrap gap-2 lg:hidden">
              {chips.length ? (
                chips.map((chip) => <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black text-[#075de8]" key={chip}>{chip}</span>)
              ) : (
                <span className="text-sm font-bold text-[#60708d]">尚未套用篩選</span>
              )}
              {chips.length ? (
                <button className="text-sm font-black text-[#075de8]" onClick={clearFilters} type="button">
                  清除
                </button>
              ) : null}
            </div> : null}

            {activeView === "today" ? (
              <div className="grid min-w-0 items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,430px)]">
                <DoctorList
                  favorites={favorites}
                  items={filteredSchedules}
                  selectedKey={selectedItem?.schedule_key ?? ""}
                  onSelect={(item) => {
                    setSelectedKey(item.schedule_key);
                    setEditingNote(false);
                  }}
                  onToggleFavorite={toggleFavorite}
                />
                <DoctorDetailPanel
                  editing={editingNote}
                  favorite={selectedItem ? favorites.includes(doctorKey(selectedItem)) : false}
                  item={selectedItem}
                  note={selectedNote}
                  onCancelEdit={() => setEditingNote(false)}
                  onEditNote={() => setEditingNote(true)}
                  onSaveNote={saveNote}
                  onToggleFavorite={() => selectedItem && toggleFavorite(selectedItem)}
                />
              </div>
            ) : activeView === "search" ? (
              <SearchCenter
                branches={filterOptions.branches}
                departments={filterOptions.departments}
                doctors={filterOptions.doctors}
                favorites={favorites}
                filters={filters}
                hospitals={hospitals}
                items={doctorSchedules}
                notes={notes}
                query={filters.query}
                regions={filterOptions.regions}
                onClearFilters={clearFilters}
                onFilterChange={updateFilters}
                onApplyFilters={(patch) => {
                  updateFilters(patch);
                  setActiveView("today");
                }}
                onOpenSchedule={(item) => {
                  setSelectedKey(item.schedule_key);
                  setEditingNote(false);
                  setActiveView("today");
                }}
                onQueryChange={(query) => updateFilters({ query })}
                onToggleFavorite={toggleFavorite}
              />
            ) : activeView === "favorites" ? (
              <FavoriteDoctorsView
                favorites={favorites}
                items={doctorSchedules}
                notes={notes}
                query={filters.query}
                onGoSearch={() => setActiveView("search")}
                onOpenSchedule={(item) => {
                  setSelectedKey(item.schedule_key);
                  setEditingNote(false);
                  setActiveView("today");
                }}
                onToggleFavorite={toggleFavorite}
              />
            ) : activeView === "notes" ? (
              <NotesView
                favorites={favorites}
                items={doctorSchedules}
                notes={notes}
                query={filters.query}
                onGoSearch={() => setActiveView("search")}
                onOpenSchedule={(item) => {
                  setSelectedKey(item.schedule_key);
                  setEditingNote(false);
                  setActiveView("today");
                }}
                onToggleFavorite={toggleFavorite}
              />
            ) : activeView === "visits" ? (
              <VisitHistoryView
                hospitals={hospitals}
                items={doctorSchedules}
                notes={notes}
                query={filters.query}
                onOpenSchedule={(item) => {
                  setSelectedKey(item.schedule_key);
                  setEditingNote(true);
                  setActiveView("today");
                }}
              />
            ) : activeView === "reminders" ? (
              <ScheduleReminderView
                items={doctorSchedules}
                notes={notes}
                query={filters.query}
                onOpenNote={(item) => {
                  setSelectedKey(item.schedule_key);
                  setEditingNote(true);
                  setActiveView("today");
                }}
                onOpenSchedule={(item) => {
                  setSelectedKey(item.schedule_key);
                  setEditingNote(false);
                  setActiveView("today");
                }}
              />
            ) : activeView === "sources" ? (
              <DataSourcesView hospitals={hospitals} query={filters.query} schedules={schedules} />
            ) : activeView === "account" ? (
              <AccountSettingsView favoriteCount={favoriteDoctorCount} noteCount={notes.length} />
            ) : (
              <ComingSoonView title="資料來源" />
            )}
          </section>
        </div>
      </div>

      <FilterBottomSheet
        branches={filterOptions.branches}
        departments={filterOptions.departments}
        doctors={filterOptions.doctors}
        filters={filters}
        hospitals={filterOptions.hospitals}
        open={filtersOpen}
        regions={filterOptions.regions}
        onChange={updateFilters}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
      />
      <MobileBottomNav activeView={activeView} onNavigate={setActiveView} />
    </main>
  );
}

function ComingSoonView({ title }: { title: string }) {
  return (
    <section className="rounded-[18px] border border-[#dbe5f4] bg-white p-8 shadow-[0_12px_30px_rgba(8,35,80,.08)]">
      <h2 className="text-2xl font-black text-[#061b3d]">{title}</h2>
      <p className="mt-3 text-sm font-bold leading-6 text-[#60708d]">這個區塊會接著整理成正式工作頁，目前可先透過今日門診與快速搜尋查看資料。</p>
    </section>
  );
}
