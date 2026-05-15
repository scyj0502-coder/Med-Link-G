import type { Hospital, PublishedSchedule } from "./types";

export type VisitStatus = "正常開診" | "異動" | "停診";
export type VisitStage = "尚未拜訪" | "已拜訪" | "需追蹤";

export type DoctorSchedule = PublishedSchedule & {
  region: string;
  hospitalLabel: string;
  branchLabel: string;
  displayPeriod: "上午" | "下午" | "晚上";
  displayRoom: string;
  status: VisitStatus;
  originalUrl: string;
};

export type PersonalNote = {
  doctorKey: string;
  content: string;
  visitStatus: VisitStage;
  lastVisitDate: string;
  nextReminder: string;
  tags: string[];
};

export type FilterState = {
  query: string;
  region: string;
  hospitalId: string;
  branchName: string;
  department: string;
  doctorName: string;
  weekday: string;
  period: string;
  favoritesOnly: boolean;
};

export const emptyFilters: FilterState = {
  query: "",
  region: "",
  hospitalId: "",
  branchName: "",
  department: "",
  doctorName: "",
  weekday: "",
  period: "",
  favoritesOnly: false
};

export const weekdayOptions = [
  { value: "0", label: "星期日" },
  { value: "1", label: "星期一" },
  { value: "2", label: "星期二" },
  { value: "3", label: "星期三" },
  { value: "4", label: "星期四" },
  { value: "5", label: "星期五" },
  { value: "6", label: "星期六" }
];

export const periodOptions = ["上午", "下午", "晚上"];

export function doctorKey(item: Pick<PublishedSchedule, "hospital_id" | "department" | "doctor_name">) {
  return [item.hospital_id, item.department, item.doctor_name].join("|");
}

export function buildDoctorSchedules(schedules: PublishedSchedule[], hospitals: Hospital[]): DoctorSchedule[] {
  const hospitalMap = new Map(hospitals.map((hospital) => [hospital.id, hospital]));

  return schedules.map((item) => {
    const hospital = hospitalMap.get(item.hospital_id);
    const status: VisitStatus = item.note?.includes("停診") ? "停診" : item.note ? "異動" : "正常開診";
    const displayPeriod = normalizePeriod(item.period);
    return {
      ...item,
      region: hospital?.region ?? "",
      hospitalLabel: item.hospital_name,
      branchLabel: item.branch_name || "總院",
      displayPeriod,
      displayRoom: formatRoom(item.room),
      status,
      originalUrl: item.source_file_url || item.source_url || hospital?.schedule_url || ""
    };
  });
}

export function filterSchedules(items: DoctorSchedule[], filters: FilterState, favorites: string[]) {
  const query = normalize(filters.query);
  return items.filter((item) => {
    const target = normalize([
      item.doctor_name,
      item.department,
      item.hospital_name,
      item.branch_name,
      item.region,
      item.weekday_label,
      item.displayPeriod,
      item.room ?? ""
    ].join(" "));

    return (
      (!query || target.includes(query)) &&
      (!filters.region || item.region === filters.region) &&
      (!filters.hospitalId || item.hospital_id === filters.hospitalId) &&
      (!filters.branchName || item.branch_name === filters.branchName) &&
      (!filters.department || item.department === filters.department) &&
      (!filters.doctorName || item.doctor_name === filters.doctorName) &&
      (!filters.weekday || String(item.weekday) === filters.weekday) &&
      (!filters.period || item.displayPeriod === filters.period) &&
      (!filters.favoritesOnly || favorites.includes(doctorKey(item)))
    );
  });
}

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "未標示";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatRoom(value?: string | null) {
  const room = (value ?? "").trim();
  return room ? `診間 ${room}` : "診間 未標示";
}

export function normalizePeriod(value: string): "上午" | "下午" | "晚上" {
  if (value === "夜診" || value === "晚上") return "晚上";
  if (value === "下午" || value === "黃昏") return "下午";
  return "上午";
}

export function filterChips(filters: FilterState, hospitals: Hospital[]) {
  const hospital = hospitals.find((item) => item.id === filters.hospitalId);
  return [
    filters.region && `地區：${filters.region}`,
    hospital && `醫院：${hospital.hospital_name}`,
    filters.branchName && `分院：${filters.branchName}`,
    filters.department && `科別：${filters.department}`,
    filters.doctorName && `醫師：${filters.doctorName}`,
    filters.weekday && `星期：${weekdayOptions.find((item) => item.value === filters.weekday)?.label ?? filters.weekday}`,
    filters.period && `時段：${filters.period}`,
    filters.favoritesOnly && "只看收藏"
  ].filter(Boolean) as string[];
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
