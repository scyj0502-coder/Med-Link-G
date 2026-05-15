"use client";

import { useEffect, useMemo, useState } from "react";
import { DoctorDetailPanel } from "../components/dashboard/DoctorDetailPanel";
import { DoctorList } from "../components/dashboard/DoctorList";
import { FilterBottomSheet } from "../components/dashboard/FilterBottomSheet";
import { FilterPanel } from "../components/dashboard/FilterPanel";
import { MobileBottomNav } from "../components/dashboard/MobileBottomNav";
import { Sidebar } from "../components/dashboard/Sidebar";
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
import type { Hospital, PublishedSchedule } from "../lib/types";

const favoriteStorageKey = "medlink:favorites:v3";

type ClientDashboardProps = {
  hospitals: Hospital[];
  schedules: PublishedSchedule[];
  initialFilters: {
    q: string;
    department: string;
    doctor: string;
  };
};

export default function ClientDashboard({ hospitals, schedules, initialFilters }: ClientDashboardProps) {
  const [filters, setFilters] = useState<FilterState>({
    ...emptyFilters,
    query: initialFilters.q,
    department: initialFilters.department,
    doctorName: initialFilters.doctor
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>(mockPersonalNotes);
  const [selectedKey, setSelectedKey] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem(favoriteStorageKey) || "[]"));
    } catch {
      setFavorites([]);
    }
  }, []);

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
      return exists ? current.map((item) => (item.doctorKey === nextNote.doctorKey ? nextNote : item)) : [...current, nextNote];
    });
    setEditingNote(false);
  }

  return (
    <main className="min-h-screen bg-[#f4f8ff] text-[#0d2348]">
      <div className="grid min-h-screen lg:grid-cols-[268px_1fr]">
        <Sidebar />
        <div className="min-w-0 pb-24 lg:pb-0">
          <Topbar
            query={filters.query}
            resultCount={filteredSchedules.length}
            onOpenFilters={() => setFiltersOpen(true)}
            onQueryChange={(query) => updateFilters({ query })}
          />

          <section className="grid gap-5 px-4 py-4 lg:px-7 lg:py-6">
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

            <div className="flex flex-wrap gap-2 lg:hidden">
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
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
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
      <MobileBottomNav />
    </main>
  );
}
