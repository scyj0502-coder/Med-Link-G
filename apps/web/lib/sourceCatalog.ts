import type { Hospital } from "./types";

export type SourceCatalogItem = Hospital & {
  plannedKind: "網頁擷取" | "PDF 檔案" | "圖片" | "手動輸入";
};

export const plannedSources: SourceCatalogItem[] = [
  {
    id: "cgmh-kaohsiung",
    enabled: false,
    region: "高雄",
    hospital_name: "高雄長庚紀念醫院",
    branch_name: "總院",
    schedule_url: "https://register.cgmh.org.tw/OpTimeSheet/250429004_upload.pdf",
    plannedKind: "PDF 檔案"
  },
  {
    id: "antai",
    enabled: false,
    region: "屏東",
    hospital_name: "安泰醫療社團法人安泰醫院",
    branch_name: "總院",
    schedule_url: "https://www.tsmh.org.tw/sites/web_dg/show_web_page.php?edsno=1003",
    plannedKind: "圖片"
  }
];

export function mergeSourceCatalog(hospitals: Hospital[]) {
  const map = new Map<string, Hospital | SourceCatalogItem>();
  for (const hospital of hospitals) {
    map.set(hospital.id, hospital);
  }
  for (const source of plannedSources) {
    if (!map.has(source.id)) {
      map.set(source.id, source);
    }
  }
  return Array.from(map.values());
}

export function plannedKindForSource(id: string) {
  return plannedSources.find((source) => source.id === id)?.plannedKind;
}
