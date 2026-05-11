const ALL = "全部";
const DATA_VERSION = "20260511b";

const hospitals = [
  { id: "kmugh", region: "高雄", name: "高雄醫學大學附設醫院", branch: "岡山醫院", lat: 22.7966, lng: 120.2946 },
  { id: "ncku", region: "台南", name: "成大醫院", branch: "總院", lat: 23.0015, lng: 120.2197 },
  { id: "chi-mei", region: "台南", name: "奇美醫院", branch: "永康院區", lat: 23.0202, lng: 120.2216 },
  { id: "tainan-municipal", region: "台南", name: "台南市立醫院", branch: "崇德院區", lat: 22.9731, lng: 120.2237 },
  { id: "kmuh", region: "高雄", name: "高雄醫學大學附設中和紀念醫院", branch: "總院", lat: 22.6467, lng: 120.3097 },
  { id: "cgmh-kao", region: "高雄", name: "高雄長庚紀念醫院", branch: "鳥松院區", lat: 22.6501, lng: 120.3565 },
  { id: "vghks", region: "高雄", name: "高雄榮民總醫院", branch: "左營院區", lat: 22.6774, lng: 120.3222 },
  { id: "ptch", region: "屏東", name: "屏東基督教醫院", branch: "總院", lat: 22.6751, lng: 120.4948 },
  { id: "pntn", region: "屏東", name: "衛福部屏東醫院", branch: "總院", lat: 22.6719, lng: 120.4868 }
];

const doctorSeed = {
  ncku: [
    ["林哲宇", "心臟內科", "心導管、高血壓、心衰竭"],
    ["陳怡君", "腫瘤內科", "乳癌、標靶治療、臨床試驗"],
    ["蘇冠廷", "胃腸肝膽科", "肝炎、膽胰疾病、內視鏡治療"],
    ["方若瑜", "神經內科", "腦中風、頭痛、失智症"],
    ["何柏叡", "胸腔內科", "肺癌、氣喘、慢性阻塞性肺病"],
    ["周品萱", "新陳代謝科", "糖尿病、甲狀腺、骨質疏鬆"],
    ["簡子豪", "腎臟內科", "腎絲球腎炎、慢性腎病"],
    ["邱以晴", "感染科", "院內感染、抗生素治療"],
    ["江柏安", "骨科", "脊椎退化、骨折創傷"],
    ["許芷瑄", "婦產科", "婦科腫瘤、高危險妊娠"],
    ["羅明哲", "泌尿科", "攝護腺、泌尿道結石"],
    ["廖心妤", "皮膚科", "乾癬、青春痘、皮膚過敏"]
  ],
  "chi-mei": [
    ["黃柏翰", "神經內科", "腦中風、巴金森氏症"],
    ["蔡孟儒", "骨科", "人工關節、運動醫學"],
    ["李佳蓉", "心臟內科", "心律不整、心臟超音波"],
    ["趙庭瑋", "腎臟內科", "慢性腎病、透析照護"],
    ["郭乃文", "感染科", "抗生素管理、感染症"],
    ["林宛臻", "風濕免疫科", "類風濕關節炎、紅斑性狼瘡"],
    ["張靖雯", "胸腔內科", "肺癌、肺阻塞、睡眠呼吸中止"],
    ["吳秉諺", "胃腸肝膽科", "胃食道逆流、肝膽胰疾病"],
    ["黃郁婷", "小兒科", "兒童氣喘、兒童感染"],
    ["林哲維", "耳鼻喉科", "鼻竇炎、聽力障礙"],
    ["陳以恩", "眼科", "視網膜、青光眼"],
    ["高宇翔", "復健科", "神經復健、運動傷害"]
  ],
  "tainan-municipal": [
    ["楊宗翰", "胸腔內科", "肺阻塞、肺炎、呼吸治療"],
    ["賴映潔", "小兒科", "兒童過敏、疫苗諮詢"],
    ["許承恩", "胃腸肝膽科", "胃食道逆流、肝膽疾病"],
    ["劉沛晴", "婦產科", "高危險妊娠、婦科腫瘤"],
    ["鄭宇軒", "泌尿科", "攝護腺、泌尿道結石"],
    ["張雅筑", "皮膚科", "乾癬、異位性皮膚炎"],
    ["曾品蓁", "心臟內科", "高血壓、心臟衰竭"],
    ["郭宥廷", "神經內科", "偏頭痛、腦中風"],
    ["林家妤", "腎臟內科", "蛋白尿、慢性腎病"],
    ["蔡承翰", "骨科", "關節鏡、骨質疏鬆"],
    ["吳庭安", "家醫科", "成人健檢、慢性病整合"],
    ["黃昱翔", "精神科", "焦慮、睡眠障礙"]
  ],
  kmuh: [
    ["洪薇雯", "內分泌新陳代謝內科", "糖尿病、甲狀腺、內分泌疾病"],
    ["陳芃文", "內分泌新陳代謝內科", "糖尿病、甲狀腺、代謝症候群"],
    ["蔡忠榮", "胸腔內科", "肺癌早篩、氣喘、肺阻塞"],
    ["許超群", "胸腔內科", "肺癌、慢性咳嗽、呼吸道疾病"],
    ["洪仁宇", "胸腔內科", "肺結節、肺炎、胸腔重症"],
    ["郭美娟", "腎臟內科", "慢性腎病、蛋白尿、腎臟遺傳疾病"],
    ["黃尚志", "腎臟內科", "透析照護、慢性腎臟病"],
    ["李佳蓉", "腎臟內科", "腎臟病、電解質異常"],
    ["蔡季君", "感染內科", "感染症、抗生素治療"],
    ["盧柏樑", "感染內科", "感染症、旅遊醫學"],
    ["林俊祐", "感染內科", "感染症、發燒診斷"],
    ["黃天祈", "心臟血管內科", "冠心症、心導管、高血壓"],
    ["卓士傑", "心臟血管內科", "心房顫動、心律不整"],
    ["張建偉", "心臟血管內科", "心衰竭、心臟超音波"],
    ["王耀廣", "胃腸內科", "胃腸疾病、內視鏡治療"],
    ["吳政毅", "胃腸內科", "內視鏡減重、胃腸道疾病"],
    ["吳登強", "胃腸內科", "消化道疾病、內視鏡治療"],
    ["黃志富", "肝膽胰內科", "肝炎、肝膽胰疾病"],
    ["葉明倫", "肝膽胰內科", "肝硬化、肝癌、膽胰疾病"],
    ["魏鈺儒", "肝膽胰內科", "肝膽胰疾病、腹部超音波"],
    ["歐燦騰", "過敏免疫風濕內科", "類風濕關節炎、免疫疾病"],
    ["吳正欽", "過敏免疫風濕內科", "僵直性脊椎炎、乾燥症"],
    ["顏正賢", "過敏免疫風濕內科", "紅斑性狼瘡、血管炎"],
    ["林冠伶", "婦產科", "婦科腫瘤、一般婦科"],
    ["陳渝潔", "婦產科", "產科、高危險妊娠"],
    ["郭昱伶", "婦產科", "婦科內視鏡、更年期照護"],
    ["楊書婷", "小兒科", "兒童感染、兒童過敏"],
    ["蘇品淳", "小兒科", "兒童胸腔、兒童氣喘"],
    ["林奕文", "小兒科", "新生兒、兒童一般疾病"],
    ["陳盈君", "皮膚科", "皮膚腫瘤、雷射治療"],
    ["吳青穎", "皮膚科", "乾癬、異位性皮膚炎"],
    ["藍政哲", "皮膚科", "指甲矯正、皮膚外科"],
    ["杜品毅", "骨科", "人工關節、骨折創傷"],
    ["許家豪", "骨科", "脊椎、運動醫學"],
    ["周伯禧", "骨科", "關節重建、骨質疏鬆"],
    ["吳怡萱", "泌尿科", "泌尿道結石、一般泌尿"],
    ["林崇裕", "泌尿科", "攝護腺、泌尿腫瘤"],
    ["溫聖辰", "泌尿科", "男性醫學、結石治療"],
    ["林憲忠", "眼科", "白內障、視網膜疾病"],
    ["劉沛綱", "眼科", "青光眼、視網膜疾病"],
    ["盧奕丞", "疼痛科", "慢性疼痛、神經阻斷治療"],
    ["林皇吉", "身心科", "焦慮、憂鬱、睡眠障礙"]
  ],
  "cgmh-kao": [
    ["張維倫", "新陳代謝科", "糖尿病、甲狀腺疾病"],
    ["劉佳穎", "腎臟內科", "慢性腎病、透析照護"],
    ["吳品叡", "骨科", "脊椎、人工關節"],
    ["黃筱雯", "腫瘤內科", "肺癌、免疫治療"],
    ["朱柏諺", "耳鼻喉科", "頭頸腫瘤、鼻竇炎"],
    ["謝宜蓁", "眼科", "白內障、視網膜疾病"],
    ["楊景翔", "心臟內科", "冠心症、心律不整"],
    ["陳郁文", "胸腔內科", "肺結節、肺癌篩檢"],
    ["蔡佳樺", "胃腸肝膽科", "肝炎、膽道疾病"],
    ["李柏辰", "整形外科", "顯微重建、傷口照護"],
    ["吳庭瑄", "小兒科", "兒童感染、兒童過敏"],
    ["許家豪", "泌尿科", "結石、泌尿腫瘤"]
  ],
  vghks: [
    ["王俊傑", "感染科", "抗生素管理、旅遊醫學"],
    ["鄭欣怡", "血液腫瘤科", "淋巴癌、貧血、化療照護"],
    ["沈立仁", "心臟內科", "心律不整、介入治療"],
    ["羅子涵", "神經內科", "癲癇、失智症"],
    ["林奕辰", "肝膽腸胃科", "肝硬化、內視鏡"],
    ["高敏華", "過敏免疫風濕科", "僵直性脊椎炎、乾燥症"],
    ["許庭睿", "胸腔內科", "肺癌、氣喘、肺阻塞"],
    ["陳佳音", "腎臟內科", "慢性腎病、血液透析"],
    ["張祐誠", "神經外科", "脊椎手術、腦血管疾病"],
    ["劉子瑜", "骨科", "運動醫學、人工關節"],
    ["林孟潔", "婦產科", "婦科腫瘤、內視鏡手術"],
    ["周柏霖", "精神科", "失眠、憂鬱症"]
  ],
  ptch: [
    ["邱冠廷", "心臟內科", "心律不整、介入治療"],
    ["蕭怡安", "胸腔內科", "肺結節、肺炎"],
    ["曾郁婷", "胃腸肝膽科", "脂肪肝、消化道潰瘍"],
    ["洪子翔", "骨科", "骨折創傷、關節鏡"],
    ["陳佩君", "婦產科", "產前檢查、更年期照護"],
    ["潘柏均", "泌尿科", "男性醫學、結石治療"],
    ["林宜蓁", "神經內科", "腦中風、神經退化疾病"],
    ["張軒豪", "腎臟內科", "慢性腎病、電解質異常"],
    ["吳柔安", "小兒科", "兒童感染、過敏氣喘"],
    ["蔡明哲", "感染科", "感染症、疫苗諮詢"],
    ["黃子芸", "皮膚科", "濕疹、皮膚感染"],
    ["高承佑", "復健科", "疼痛復健、運動傷害"]
  ],
  pntn: [
    ["郭芷涵", "小兒科", "兒童過敏、疫苗諮詢"],
    ["李彥廷", "家醫科", "慢性病整合、成人健檢"],
    ["蔡承祐", "神經內科", "腦中風、偏頭痛"],
    ["林思妤", "皮膚科", "青春痘、皮膚過敏"],
    ["何俊毅", "復健科", "肩頸痠痛、運動傷害"],
    ["黃可欣", "精神科", "焦慮、睡眠障礙"],
    ["陳威廷", "心臟內科", "高血壓、心律不整"],
    ["劉怡君", "胸腔內科", "氣喘、慢性咳嗽"],
    ["楊景雯", "胃腸肝膽科", "肝炎、胃腸疾病"],
    ["許柏均", "骨科", "骨折創傷、關節退化"],
    ["蘇品妍", "婦產科", "婦科感染、產前照護"],
    ["王立安", "眼科", "白內障、青光眼"]
  ]
};

const periodCycle = ["上午", "下午", "夜診"];
const weekdayCycle = [[1, 3, 5], [2, 4], [1, 4], [2, 5], [3, 5], [2, 4, 6]];
const roomPrefix = {
  "心臟內科": "心內",
  "心臟血管內科": "心內",
  "腫瘤內科": "腫內",
  "胃腸肝膽科": "肝膽",
  "胃腸內科": "胃腸",
  "肝膽胰內科": "肝膽",
  "肝膽腸胃科": "肝膽",
  "神經內科": "神內",
  "胸腔內科": "胸內",
  "內分泌新陳代謝內科": "內分泌",
  "新陳代謝科": "新陳",
  "腎臟內科": "腎內",
  "感染科": "感染",
  "感染內科": "感染",
  "血液腫瘤科": "血腫",
  "大腸直腸外科": "直腸",
  "骨科": "骨科",
  "小兒科": "兒科",
  "婦產科": "婦產",
  "泌尿科": "泌尿",
  "皮膚科": "皮膚",
  "復健科": "復健",
  "疼痛科": "疼痛",
  "神經外科": "神外",
  "整形外科": "整外",
  "耳鼻喉科": "耳鼻",
  "眼科": "眼科",
  "放射腫瘤科": "放腫",
  "家醫科": "家醫",
  "精神科": "精神",
  "身心科": "身心",
  "風濕免疫科": "免疫",
  "過敏免疫風濕內科": "免疫",
  "過敏免疫風濕科": "免疫"
};

let doctors = Object.entries(doctorSeed).flatMap(([hospitalId, rows]) =>
  rows.map(([name, department, specialty], index) => ({
    id: `${hospitalId}-${String(index + 1).padStart(2, "0")}`,
    name,
    department,
    specialty,
    hospitalId
  }))
);

let sessionTemplates = doctors.map((doctor, index) => ({
  doctorId: doctor.id,
  weekdays: weekdayCycle[index % weekdayCycle.length],
  period: periodCycle[index % periodCycle.length],
  room: `${roomPrefix[doctor.department] || "門診"}${String((index % 9) + 1).padStart(2, "0")}`
}));

const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];
const statusMap = {
  normal: { label: "正常開診", className: "normal" },
  cancelled: { label: "臨時停診", className: "cancelled" },
  changed: { label: "班別調動", className: "changed" },
  substitute: { label: "代診", className: "changed" }
};

const defaultFilters = {
  search: "",
  region: ALL,
  hospital: ALL,
  department: ALL,
  doctor: ALL
};

const state = {
  viewedDate: new Date(),
  selectedDate: new Date(),
  selectedWeekday: null,
  viewMode: "dashboard",
  reviewStatusFilter: ALL,
  filters: { ...defaultFilters },
  draftFilters: { ...defaultFilters },
  favorites: JSON.parse(localStorage.getItem("medlink:favorites") || "[]"),
  verifications: JSON.parse(localStorage.getItem("medlink:verifications") || "{}"),
  sourceStatus: null,
  deferredInstallPrompt: null
};

let appointments = [];

const $ = (selector) => document.querySelector(selector);
const elements = {
  regionFilter: $("#regionFilter"),
  hospitalFilter: $("#hospitalFilter"),
  departmentFilter: $("#departmentFilter"),
  doctorFilter: $("#doctorFilter"),
  doctorSearch: $("#doctorSearch"),
  calendarGrid: $("#calendarGrid"),
  monthTitle: $("#monthTitle"),
  appointmentList: $("#appointmentList"),
  selectedDateTitle: $("#selectedDateTitle"),
  weekdayFilter: $("#weekdayFilter"),
  nextSync: $("#nextSync"),
  changedCount: $("#changedCount"),
  monthTotal: $("#monthTotal"),
  todayTotal: $("#todayTotal"),
  favoriteTotal: $("#favoriteTotal"),
  cancelledTotal: $("#cancelledTotal"),
  toast: $("#toast"),
  detailDialog: $("#detailDialog"),
  detailHospital: $("#detailHospital"),
  detailDoctor: $("#detailDoctor"),
  detailBody: $("#detailBody"),
  installButton: $("#installButton"),
  querySummary: $("#querySummary"),
  validationToggle: $("#validationToggle"),
  closeValidation: $("#closeValidation"),
  validationPanel: $("#validationPanel"),
  validationSummary: $("#validationSummary"),
  validationList: $("#validationList"),
  importValidation: $("#importValidation"),
  exportValidation: $("#exportValidation"),
  confirmVisibleValidation: $("#confirmVisibleValidation"),
  validationFile: $("#validationFile"),
  reviewFilter: $("#reviewFilter"),
  workspace: $(".workspace"),
  metrics: $(".metrics")
};

function buildAppointments() {
  const items = [];
  const start = new Date();
  start.setMonth(start.getMonth() - 1, 1);
  const end = new Date();
  end.setMonth(end.getMonth() + 2, 0);

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const day = date.getDay();
    sessionTemplates.forEach((template, index) => {
      if (!template.weekdays.includes(day)) return;
      const doctor = doctors.find((item) => item.id === template.doctorId);
      const hospital = hospitals.find((item) => item.id === doctor.hospitalId);
      const iso = toIsoDate(date);
      let status = "normal";
      let note = "";
      let substitute = "";

      if (template.syncPending) {
        status = "changed";
        note = template.pendingNote || "來源清單已啟用；待解析後更新醫師與診次。";
      } else if (date.getDate() === 8 && index % 13 === 2) {
        status = "cancelled";
        note = "醫師臨時請假，官網於 08:00 同步時偵測停診。";
      } else if (date.getDate() === 15 && index % 11 === 4) {
        status = "changed";
        note = "原上午診調整為下午診，請重新安排拜訪路線。";
      } else if (date.getDate() === 22 && index % 17 === 7) {
        status = "substitute";
        note = "由同科醫師代診，重點醫師追蹤已觸發提醒。";
        substitute = "代診醫師";
      } else if (date.getDay() === 5 && date.getDate() % 13 === 0 && index % 9 === 0) {
        status = "cancelled";
        note = "醫院公告臨時停診，請確認替代拜訪時段。";
      }

      items.push({
        id: `${doctor.id}-${iso}-${template.period}-${template.room}`,
        date: iso,
        weekday: day,
        period: status === "changed" ? "下午" : template.period,
        originalPeriod: template.period,
        room: template.room,
        rawClinic: template.rawClinic || template.room,
        sourceDepartment: template.sourceDepartment || doctor.department,
        category: template.category || doctor.department,
        sourceUrl: template.sourceUrl || doctor.sourceUrl || "",
        sourcePage: template.sourcePage || "",
        sourceWeekdayLabel: template.sourceWeekdayLabel || "",
        sourceNote: template.sourceNote || "",
        sourceStatus: template.sourceStatus || null,
        syncPending: Boolean(template.syncPending),
        status,
        note,
        substitute,
        doctor,
        hospital
      });
    });
  }
  return items;
}

async function init() {
  await loadSourceSyncStatus();
  await loadSourceRegistry();
  await loadExternalSchedules();
  appointments = buildAppointments();
  populateWeekdayFilter();
  populateFilters();
  bindEvents();
  updateSyncInfo();
  applyFilters(false);
  registerPwa();
}

async function loadSourceSyncStatus() {
  if (location.protocol === "file:") return;
  try {
    const response = await fetch(`./data/source-sync-status.json?v=${DATA_VERSION}`, { cache: "no-store" });
    if (!response.ok) return;
    state.sourceStatus = await response.json();
  } catch (error) {
    console.info("Source sync status could not be loaded.", error);
  }
}

async function loadExternalSchedules() {
  if (location.protocol === "file:") return;
  const sources = ["./data/okayama.json", "./data/kmuh.json"];
  for (const sourceUrl of sources) {
    try {
      const response = await fetch(`${sourceUrl}?v=${DATA_VERSION}`, { cache: "no-store" });
      if (!response.ok) continue;
      const schedule = await response.json();
      mergeExternalSchedule(schedule);
    } catch (error) {
      console.info(`Using bundled demo schedule because ${sourceUrl} could not be loaded.`, error);
    }
  }
}

async function loadSourceRegistry() {
  if (location.protocol === "file:") return;
  try {
    const response = await fetch(`./data/source-registry.json?v=${DATA_VERSION}`, { cache: "no-store" });
    if (!response.ok) return;
    const registry = await response.json();
    mergeSourceRegistry(registry);
  } catch (error) {
    console.info("Source registry could not be loaded; using bundled demo data only.", error);
  }
}

function mergeSourceRegistry(payload) {
  if (!Array.isArray(payload.enabled)) return;

  payload.enabled.forEach((source, sourceIndex) => {
    if (!source.enabled) return;
    const hospital = upsertSourceHospital(source, sourceIndex);
    const sourceType = source.source_type || "來源";
    const isPdf = sourceType.toUpperCase() === "PDF";
    const sourceStatus = findSourceStatus(source);
    const pendingNote = source.note || sourceStatus?.message || `${hospital.branch}門診${sourceType}已啟用；${isPdf ? "待 OCR 解析後更新醫師與診次" : "待解析後更新醫師與診次"}。`;

    (source.departments || []).forEach((department, departmentIndex) => {
      const doctorId = `source-${hospital.id}-${sourceIndex + 1}-${departmentIndex + 1}`;

      if (!doctors.some((doctor) => doctor.id === doctorId)) {
        doctors.unshift({
          id: doctorId,
          name: "待同步",
          department,
          specialty: `${sourceType} 來源清單已啟用，等待${isPdf ? " OCR" : ""}解析`,
          hospitalId: hospital.id,
          sourceUrl: source.schedule_url
        });
      }

      if (!sessionTemplates.some((session) => session.doctorId === doctorId)) {
        sessionTemplates.unshift({
          doctorId,
          weekdays: [1, 2, 3, 4, 5],
          period: "待同步",
          room: `來源清單：${department}`,
          rawClinic: `來源清單：${department}`,
          sourceDepartment: department,
          category: department,
          sourceUrl: source.schedule_url,
          sourceStatus,
          syncPending: true,
          pendingNote
        });
      }
    });
  });
}

function findSourceStatus(source) {
  const items = state.sourceStatus?.sources || [];
  return items.find((item) => item.source?.schedule_url === source.schedule_url);
}

function upsertSourceHospital(source, sourceIndex) {
  const name = source.hospital_full_name || source.hospital_name || source.hospital_short_name || "未命名醫院";
  const branch = source.branch_name || "總院";
  const existing = hospitals.find((hospital) => hospital.name === name && hospital.branch === branch);
  if (existing) return existing;

  const hospital = {
    id: `source-hospital-${sourceIndex + 1}`,
    region: source.region || "未分類",
    name,
    branch,
    lat: 22.6273,
    lng: 120.3014
  };
  hospitals.unshift(hospital);
  return hospital;
}

function mergeExternalSchedule(payload) {
  const source = payload.source || {};
  const hospitalId = source.hospitalId;
  if (!hospitalId || !Array.isArray(payload.doctors) || !Array.isArray(payload.sessions)) return;

  doctors = doctors.filter((doctor) => doctor.hospitalId !== hospitalId);
  sessionTemplates = sessionTemplates.filter((session) => {
    const doctor = doctors.find((item) => item.id === session.doctorId);
    return doctor && doctor.hospitalId !== hospitalId;
  });

  const externalDoctors = payload.doctors.map((doctor) => ({
    id: doctor.id,
    name: doctor.name,
    department: doctor.department,
    rawDepartment: doctor.rawDepartment || doctor.department,
    rawClinic: doctor.rawClinic || doctor.rawDepartment || doctor.department,
    specialty: doctor.specialty || `${doctor.department}門診`,
    hospitalId
  }));
  doctors = [...doctors, ...externalDoctors];

  const doctorIds = new Set(externalDoctors.map((doctor) => doctor.id));
  const externalSessions = payload.sessions
    .filter((session) => doctorIds.has(findExternalDoctorId(externalDoctors, session)))
    .map((session) => ({
      doctorId: findExternalDoctorId(externalDoctors, session),
      weekdays: session.weekdays,
      period: session.period,
      room: session.room || session.clinic || session.clinicCode || "門診",
      rawClinic: session.rawClinic || session.clinic || session.department,
      sourceDepartment: session.department,
      category: session.category || session.department,
      sourceUrl: session.sourceUrl || source.pageUrl || source.pdfUrl || "",
      sourcePage: session.sourcePage || "",
      sourceWeekdayLabel: session.sourceWeekdayLabel || "",
      sourceNote: session.note || source.note || ""
    }));
  sessionTemplates = [...sessionTemplates, ...externalSessions];
}

function findExternalDoctorId(externalDoctors, session) {
  const doctor = externalDoctors.find((item) =>
    item.name === session.doctorName && item.rawDepartment === session.department
  );
  return doctor ? doctor.id : "";
}

function bindEvents() {
  elements.doctorSearch.addEventListener("input", (event) => {
    state.draftFilters.search = event.target.value.trim();
    updateQuerySummary();
  });

  [
    ["regionFilter", "region"],
    ["hospitalFilter", "hospital"],
    ["departmentFilter", "department"],
    ["doctorFilter", "doctor"]
  ].forEach(([elementKey, filterKey]) => {
    elements[elementKey].addEventListener("change", (event) => {
      state.draftFilters[filterKey] = event.target.value;
      if (filterKey === "region") state.draftFilters.hospital = ALL;
      if (["region", "hospital"].includes(filterKey)) state.draftFilters.department = ALL;
      if (["region", "hospital", "department"].includes(filterKey)) state.draftFilters.doctor = ALL;
      populateFilters();
      updateQuerySummary();
    });
  });

  $("#applyFilters").addEventListener("click", () => applyFilters(true));

  elements.validationToggle.addEventListener("click", () => {
    state.viewMode = "validation";
    render();
  });

  elements.closeValidation.addEventListener("click", () => {
    state.viewMode = "dashboard";
    render();
  });

  elements.exportValidation.addEventListener("click", exportValidationJson);
  elements.importValidation.addEventListener("click", () => elements.validationFile.click());
  elements.validationFile.addEventListener("change", importValidationJson);
  elements.confirmVisibleValidation.addEventListener("click", confirmVisibleValidationItems);

  $("#resetFilters").addEventListener("click", () => {
    state.filters = { ...defaultFilters };
    state.draftFilters = { ...defaultFilters };
    state.selectedWeekday = null;
    elements.doctorSearch.value = "";
    populateFilters();
    render();
    showToast("已重設查詢條件，顯示全部診表。");
  });

  $("#prevMonth").addEventListener("click", () => {
    state.viewedDate.setMonth(state.viewedDate.getMonth() - 1);
    render();
  });

  $("#nextMonth").addEventListener("click", () => {
    state.viewedDate.setMonth(state.viewedDate.getMonth() + 1);
    render();
  });

  $("#todayButton").addEventListener("click", () => {
    state.selectedDate = new Date();
    state.viewedDate = new Date();
    state.selectedWeekday = null;
    render();
  });

  $("#notifyButton").addEventListener("click", () => {
    const tracked = getFilteredAppointments().filter((item) => isFavorite(item.doctor.id) || item.status !== "normal");
    showToast(`已模擬推播 ${tracked.length} 則重點通知，可銜接 Telegram Bot API。`);
  });

  $("#closeDialog").addEventListener("click", () => elements.detailDialog.close());

  elements.installButton.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    elements.installButton.hidden = true;
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    elements.installButton.hidden = false;
  });
}

function applyFilters(announce) {
  state.filters = { ...state.draftFilters };
  state.selectedWeekday = null;
  const filtered = getFilteredAppointments();
  const nextDate = findNearestAppointmentDate(filtered, state.selectedDate);
  if (nextDate) {
    state.selectedDate = nextDate;
    state.viewedDate = new Date(nextDate);
  }
  render();
  if (announce) {
    showToast(`查詢完成：符合條件 ${filtered.length} 筆診次。`);
  }
}

function populateFilters() {
  setOptions(elements.regionFilter, [ALL, ...unique(hospitals.map((item) => item.region))], state.draftFilters.region);

  const hospitalOptions = hospitals
    .filter((item) => matchesDraftRegion(item))
    .map((item) => hospitalLabel(item));
  setOptions(elements.hospitalFilter, [ALL, ...hospitalOptions], state.draftFilters.hospital);

  const availableDoctors = doctors.filter((doctor) => {
    const hospital = hospitals.find((item) => item.id === doctor.hospitalId);
    return matchesDraftRegion(hospital) && matchesDraftHospital(hospital);
  });
  setOptions(elements.departmentFilter, [ALL, ...unique(availableDoctors.map((item) => item.department))], state.draftFilters.department);

  const doctorOptions = availableDoctors
    .filter((doctor) => state.draftFilters.department === ALL || doctor.department === state.draftFilters.department)
    .map((doctor) => doctor.name);
  setOptions(elements.doctorFilter, [ALL, ...doctorOptions], state.draftFilters.doctor);
}

function populateWeekdayFilter() {
  elements.weekdayFilter.innerHTML = weekdayNames
    .map((day, index) => `<button type="button" data-weekday="${index}">${day}</button>`)
    .join("");
  elements.weekdayFilter.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const weekday = Number(button.dataset.weekday);
    state.selectedWeekday = state.selectedWeekday === weekday ? null : weekday;
    render();
  });
}

function render() {
  const filtered = getFilteredAppointments();
  renderMetrics(filtered);
  renderCalendar(filtered);
  renderAppointments(filtered);
  renderValidation(filtered);
  updateQuerySummary(filtered);
  elements.changedCount.textContent = filtered.filter((item) => item.status !== "normal").length;
  elements.favoriteTotal.textContent = state.favorites.length;
  elements.workspace.hidden = state.viewMode !== "dashboard";
  elements.metrics.hidden = state.viewMode !== "dashboard";
  elements.validationPanel.hidden = state.viewMode !== "validation";
  elements.validationToggle.textContent = state.viewMode === "validation" ? "診表看板" : "資料驗證";
}

function renderMetrics(filtered) {
  const viewedMonth = state.viewedDate.getMonth();
  const viewedYear = state.viewedDate.getFullYear();
  const todayIso = toIsoDate(new Date());
  elements.monthTotal.textContent = filtered.filter((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    return date.getMonth() === viewedMonth && date.getFullYear() === viewedYear;
  }).length;
  elements.todayTotal.textContent = filtered.filter((item) => item.date === todayIso && item.status !== "cancelled").length;
  elements.cancelledTotal.textContent = filtered.filter((item) => item.status === "cancelled").length;
}

function renderCalendar(filtered) {
  const year = state.viewedDate.getFullYear();
  const month = state.viewedDate.getMonth();
  elements.monthTitle.textContent = `${year} 年 ${month + 1} 月看板`;

  const first = new Date(year, month, 1);
  const cursor = new Date(first);
  cursor.setDate(cursor.getDate() - cursor.getDay());
  const selectedIso = toIsoDate(state.selectedDate);
  const cells = [];

  for (let i = 0; i < 42; i += 1) {
    const iso = toIsoDate(cursor);
    const dayItems = filtered.filter((item) => item.date === iso);
    const changed = dayItems.filter((item) => item.status !== "normal");
    const classes = [
      "calendar-day",
      cursor.getMonth() !== month ? "is-muted" : "",
      iso === selectedIso ? "is-selected" : "",
      changed.length ? "has-alert" : ""
    ].filter(Boolean).join(" ");

    cells.push(`
      <button type="button" class="${classes}" data-date="${iso}">
        <span class="day-number">${cursor.getDate()} <span class="count-pill">${dayItems.length}</span></span>
        <span class="mini-list">
          ${dayItems.slice(0, 3).map((item) => `<span class="${item.status !== "normal" ? "mini-alert" : ""}">${item.period} ${item.doctor.name}</span>`).join("")}
        </span>
      </button>
    `);
    cursor.setDate(cursor.getDate() + 1);
  }

  elements.calendarGrid.innerHTML = cells.join("");
  elements.calendarGrid.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = new Date(`${button.dataset.date}T00:00:00`);
      state.selectedWeekday = null;
      render();
    });
  });
}

function renderAppointments(filtered) {
  const selectedIso = toIsoDate(state.selectedDate);
  const weekday = state.selectedWeekday;
  const list = filtered
    .filter((item) => (weekday === null ? item.date === selectedIso : item.weekday === weekday))
    .sort((a, b) => `${a.date}${a.period}`.localeCompare(`${b.date}${b.period}`, "zh-Hant"));

  elements.selectedDateTitle.textContent = weekday === null
    ? `${formatDate(state.selectedDate)} 診次（當日，不是全科全部醫師）`
    : `星期${weekdayNames[weekday]}週表`;

  elements.weekdayFilter.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.weekday) === weekday);
  });

  if (!list.length) {
    const nearest = findNearestAppointmentDate(filtered, state.selectedDate);
    const hint = nearest ? `最近有診日期：${formatDate(nearest)}，可點月曆該日查看。` : "可調整地區、醫院、科別或醫師後按「套用查詢」。";
    elements.appointmentList.innerHTML = `<div class="empty-state">目前選定日期沒有診次。${hint}</div>`;
    return;
  }

  elements.appointmentList.innerHTML = list.map((item) => {
    const status = statusMap[item.status];
    const favorite = isFavorite(item.doctor.id);
    const verification = verificationFor(validationItemFromAppointment(item));
    return `
      <article class="appointment-card ${item.status !== "normal" ? "changed" : ""}">
        <div class="appointment-title">
          <div>
            <h3>${item.doctor.name} · ${item.category}</h3>
            <p class="appointment-meta">${item.hospital.region}｜${item.hospital.name} ${item.hospital.branch}</p>
          </div>
          <span class="status-pill ${status.className}">${status.label}</span>
        </div>
        <span class="review-pill ${verification.status}">${verificationLabel(verification.status)}</span>
        <p class="appointment-meta">${item.date} 星期${weekdayNames[item.weekday]}｜${item.period}｜原始診別 ${item.rawClinic}</p>
        ${item.note ? `<p class="mini-alert">${item.note}</p>` : ""}
        <div class="card-actions">
          <button class="small-button ${favorite ? "favorited" : ""}" type="button" data-favorite="${item.doctor.id}">${favorite ? "已收藏" : "收藏"}</button>
          <button class="small-button" type="button" data-detail="${item.id}">詳細資訊</button>
          <button class="small-button" type="button" data-nav="${item.id}">導航</button>
        </div>
      </article>
    `;
  }).join("");

  elements.appointmentList.querySelectorAll("[data-favorite]").forEach((button) => {
    button.addEventListener("click", () => toggleFavorite(button.dataset.favorite));
  });
  elements.appointmentList.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => openDetail(button.dataset.detail));
  });
  elements.appointmentList.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => openNavigation(button.dataset.nav));
  });
}

function renderValidation(filtered) {
  if (state.viewMode !== "validation") return;
  const items = buildValidationItems(filtered);
  const visibleItems = items.filter((item) =>
    state.reviewStatusFilter === ALL || verificationFor(item).status === state.reviewStatusFilter
  );
  const counts = {
    pending: items.filter((item) => verificationFor(item).status === "pending").length,
    confirmed: items.filter((item) => verificationFor(item).status === "confirmed").length,
    issue: items.filter((item) => verificationFor(item).status === "issue").length
  };
  renderReviewFilter(counts);
  elements.validationSummary.innerHTML = `
    <article><span>待確認</span><strong>${counts.pending}</strong></article>
    <article><span>已人工確認</span><strong>${counts.confirmed}</strong></article>
    <article><span>有疑問</span><strong>${counts.issue}</strong></article>
    <article><span>樣板診次</span><strong>${items.length}</strong></article>
  `;

  if (!visibleItems.length) {
    elements.validationList.innerHTML = `<div class="empty-state">目前篩選條件沒有可驗證診次。</div>`;
    return;
  }

  elements.validationList.innerHTML = visibleItems.map((item) => {
    const verification = verificationFor(item);
    return `
      <article class="validation-card ${verification.status}">
        <div class="validation-card-head">
          <div>
            <h3>${escapeHtml(item.doctor.name)} · ${escapeHtml(item.category)}</h3>
            <p class="appointment-meta">${escapeHtml(item.hospital.name)} ${escapeHtml(item.hospital.branch)}｜星期${weekdayNames[item.weekday]}｜${escapeHtml(item.period)}｜診間/代號 ${escapeHtml(item.room)}</p>
          </div>
          <span class="review-pill ${verification.status}">${verificationLabel(verification.status)}</span>
        </div>
        <div class="validation-grid">
          <div><span>來源頁碼</span><strong>${item.sourcePage ? `PDF 第 ${escapeHtml(String(item.sourcePage))} 頁` : "未標示"}</strong></div>
          <div><span>來源星期</span><strong>${escapeHtml(item.sourceWeekdayLabel || `星期${weekdayNames[item.weekday]}`)}</strong></div>
          <div><span>原始診別</span><strong>${escapeHtml(item.rawClinic)}</strong></div>
          <div><span>資料來源</span><strong>${item.sourceUrl ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener">開啟來源</a>` : "未標示"}</strong></div>
        </div>
        ${item.sourceNote ? `<p class="appointment-meta">${escapeHtml(item.sourceNote)}</p>` : ""}
        <div class="review-controls">
          <label>
            <span>校正狀態</span>
            <select data-review-status="${item.validationKey}">
              <option value="pending" ${verification.status === "pending" ? "selected" : ""}>OCR待確認</option>
              <option value="confirmed" ${verification.status === "confirmed" ? "selected" : ""}>已人工確認</option>
              <option value="issue" ${verification.status === "issue" ? "selected" : ""}>有疑問</option>
            </select>
          </label>
          <label>
            <span>校正備註</span>
            <textarea data-review-note="${item.validationKey}" rows="2" placeholder="例如：醫師姓名需重查、5/28 限診、診間代號需確認">${escapeHtml(verification.note || "")}</textarea>
          </label>
        </div>
      </article>
    `;
  }).join("");

  elements.validationList.querySelectorAll("[data-review-status]").forEach((select) => {
    select.addEventListener("change", () => updateVerification(select.dataset.reviewStatus, { status: select.value }));
  });
  elements.validationList.querySelectorAll("[data-review-note]").forEach((textarea) => {
    textarea.addEventListener("change", () => updateVerification(textarea.dataset.reviewNote, { note: textarea.value }));
  });
}

function renderReviewFilter(counts) {
  const options = [
    [ALL, `全部 ${counts.pending + counts.confirmed + counts.issue}`],
    ["pending", `待確認 ${counts.pending}`],
    ["confirmed", `已確認 ${counts.confirmed}`],
    ["issue", `有疑問 ${counts.issue}`]
  ];
  elements.reviewFilter.innerHTML = options.map(([value, label]) => `
    <button type="button" class="${state.reviewStatusFilter === value ? "active" : ""}" data-review-filter="${value}">${label}</button>
  `).join("");
  elements.reviewFilter.querySelectorAll("[data-review-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.reviewStatusFilter = button.dataset.reviewFilter;
      render();
    });
  });
}

function buildValidationItems(filtered) {
  const seen = new Set();
  return filtered
    .map(validationItemFromAppointment)
    .filter((item) => {
      if (seen.has(item.validationKey)) return false;
      seen.add(item.validationKey);
      return true;
    })
    .sort((a, b) => `${a.category}${a.weekday}${a.period}${a.room}${a.doctor.name}`.localeCompare(`${b.category}${b.weekday}${b.period}${b.room}${b.doctor.name}`, "zh-Hant"));
}

function validationItemFromAppointment(item) {
  return {
    ...item,
    validationKey: [
      item.hospital.id,
      item.doctor.id,
      item.weekday,
      item.period,
      item.room,
      item.category
    ].join("|")
  };
}

function verificationFor(item) {
  return state.verifications[item.validationKey] || { status: item.sourcePage ? "pending" : "confirmed", note: "" };
}

function updateVerification(key, patch) {
  const previous = state.verifications[key] || { status: "pending", note: "" };
  state.verifications[key] = { ...previous, ...patch, updatedAt: new Date().toISOString() };
  localStorage.setItem("medlink:verifications", JSON.stringify(state.verifications));
  render();
}

function exportValidationJson() {
  const items = buildValidationItems(getFilteredAppointments()).map((item) => ({
    key: item.validationKey,
    hospital: hospitalLabel(item.hospital),
    department: item.category,
    doctor: item.doctor.name,
    weekday: `星期${weekdayNames[item.weekday]}`,
    period: item.period,
    room: item.room,
    sourcePage: item.sourcePage,
    sourceUrl: item.sourceUrl,
    verification: verificationFor(item)
  }));
  const payload = {
    exportedAt: new Date().toISOString(),
    filters: state.filters,
    items
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `med-link-validation-${toIsoDate(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast(`已匯出 ${items.length} 筆校正資料。`);
}

async function importValidationJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (!Array.isArray(payload.items)) throw new Error("校正檔缺少 items 陣列。");
    let imported = 0;
    payload.items.forEach((item) => {
      if (!item.key || !item.verification) return;
      state.verifications[item.key] = {
        status: item.verification.status || "pending",
        note: item.verification.note || "",
        updatedAt: item.verification.updatedAt || new Date().toISOString()
      };
      imported += 1;
    });
    localStorage.setItem("medlink:verifications", JSON.stringify(state.verifications));
    showToast(`已匯入 ${imported} 筆校正資料。`);
    render();
  } catch (error) {
    showToast(`匯入失敗：${error.message}`);
  } finally {
    event.target.value = "";
  }
}

function confirmVisibleValidationItems() {
  const items = buildValidationItems(getFilteredAppointments()).filter((item) =>
    state.reviewStatusFilter === ALL || verificationFor(item).status === state.reviewStatusFilter
  );
  items.forEach((item) => {
    const previous = verificationFor(item);
    state.verifications[item.validationKey] = {
      ...previous,
      status: "confirmed",
      updatedAt: new Date().toISOString()
    };
  });
  localStorage.setItem("medlink:verifications", JSON.stringify(state.verifications));
  showToast(`已將目前清單 ${items.length} 筆標為已人工確認。`);
  render();
}

function verificationLabel(status) {
  return {
    pending: "OCR待確認",
    confirmed: "已人工確認",
    issue: "有疑問"
  }[status] || "OCR待確認";
}

function updateQuerySummary(filtered = getFilteredAppointments()) {
  const draftParts = Object.entries(state.draftFilters)
    .filter(([, value]) => value && value !== ALL)
    .map(([key, value]) => `${filterLabel(key)}：${value}`);
  const activeParts = Object.entries(state.filters)
    .filter(([, value]) => value && value !== ALL)
    .map(([key, value]) => `${filterLabel(key)}：${value}`);
  const isDirty = JSON.stringify(state.draftFilters) !== JSON.stringify(state.filters);
  const base = activeParts.length ? activeParts.join("、") : "全部院所與科別";
  const doctorNames = unique(filtered.map((item) => item.doctor.name));
  const doctorPreview = doctorNames.slice(0, 12).join("、");
  const moreText = doctorNames.length > 12 ? ` 等 ${doctorNames.length} 位` : "";
  elements.querySummary.textContent = isDirty
    ? `條件已變更，請按「套用查詢」。草稿：${draftParts.join("、") || "全部"}`
    : `目前顯示 ${base}，共 ${filtered.length} 筆診次；符合醫師 ${doctorNames.length} 位：${doctorPreview}${moreText || "。"}`;
}

function getFilteredAppointments() {
  const query = state.filters.search.toLowerCase();
  return appointments.filter((item) => {
    const hospitalText = hospitalLabel(item.hospital);
    const searchPool = `${item.doctor.name} ${item.doctor.department} ${item.doctor.rawDepartment || ""} ${item.rawClinic || ""} ${item.doctor.specialty} ${hospitalText}`.toLowerCase();
    return (!query || searchPool.includes(query))
      && matchesRegion(item.hospital)
      && matchesHospital(item.hospital)
      && (state.filters.department === ALL || item.doctor.department === state.filters.department)
      && (state.filters.doctor === ALL || item.doctor.name === state.filters.doctor);
  });
}

function findNearestAppointmentDate(items, fromDate) {
  if (!items.length) return null;
  const fromTime = new Date(toIsoDate(fromDate)).getTime();
  const dates = unique(items.map((item) => item.date));
  const future = dates.find((date) => new Date(date).getTime() >= fromTime);
  return new Date(`${future || dates[0]}T00:00:00`);
}

function matchesRegion(hospital) {
  return state.filters.region === ALL || hospital.region === state.filters.region;
}

function matchesHospital(hospital) {
  return state.filters.hospital === ALL || hospitalLabel(hospital) === state.filters.hospital;
}

function matchesDraftRegion(hospital) {
  return state.draftFilters.region === ALL || hospital.region === state.draftFilters.region;
}

function matchesDraftHospital(hospital) {
  return state.draftFilters.hospital === ALL || hospitalLabel(hospital) === state.draftFilters.hospital;
}

function hospitalLabel(hospital) {
  return `${hospital.name} ${hospital.branch}`;
}

function filterLabel(key) {
  return {
    search: "關鍵字",
    region: "地區",
    hospital: "醫院",
    department: "科別",
    doctor: "醫師"
  }[key];
}

function setOptions(select, options, selected) {
  select.innerHTML = options.map((option) => `<option value="${option}">${option}</option>`).join("");
  select.value = options.includes(selected) ? selected : ALL;
}

function toggleFavorite(doctorId) {
  state.favorites = isFavorite(doctorId)
    ? state.favorites.filter((id) => id !== doctorId)
    : [...state.favorites, doctorId];
  localStorage.setItem("medlink:favorites", JSON.stringify(state.favorites));
  const doctor = doctors.find((item) => item.id === doctorId);
  showToast(`${doctor.name} 已${isFavorite(doctorId) ? "加入" : "移除"}重點追蹤`);
  render();
}

function openDetail(id) {
  const item = appointments.find((appointment) => appointment.id === id);
  if (!item) return;
  elements.detailHospital.textContent = `${item.hospital.region}｜${item.hospital.name} ${item.hospital.branch}`;
  elements.detailDoctor.textContent = `${item.doctor.name} ${item.category}`;
  elements.detailBody.innerHTML = `
    <div class="detail-grid">
      <div><span>日期班別</span><strong>${item.date} 星期${weekdayNames[item.weekday]} ${item.period}</strong></div>
      <div><span>標準分類</span><strong>${item.category}</strong></div>
      <div><span>原始診別</span><strong>${item.rawClinic}</strong></div>
      <div><span>PDF 科別/診別</span><strong>${item.sourceDepartment}</strong></div>
      <div><span>來源頁碼</span><strong>${item.sourcePage ? `PDF 第 ${item.sourcePage} 頁` : "未標示"}</strong></div>
      <div><span>醫師專長</span><strong>${item.doctor.specialty}</strong></div>
      <div><span>追蹤狀態</span><strong>${isFavorite(item.doctor.id) ? "已收藏，優先推播" : "尚未收藏"}</strong></div>
      ${item.sourceUrl ? `<div><span>來源網址</span><strong><a href="${item.sourceUrl}" target="_blank" rel="noopener">開啟門診來源</a></strong></div>` : ""}
      ${item.sourceStatus ? `<div><span>同步狀態</span><strong>${sourceStatusLabel(item.sourceStatus)}</strong></div>` : ""}
    </div>
    ${item.substitute ? `<div class="change-note">代診醫師：${item.substitute}</div>` : ""}
    ${item.note ? `<div class="change-note">${item.note}</div>` : ""}
    ${item.sourceStatus?.inspection ? `<div class="change-note">${sourceInspectionLabel(item.sourceStatus.inspection)}</div>` : ""}
  `;
  elements.detailDialog.showModal();
}

function sourceStatusLabel(status) {
  if (status.inspection?.requiresOcr) return "圖片型 PDF，待 OCR";
  if (status.status === "ok") return "來源可讀取";
  return "來源讀取異常";
}

function sourceInspectionLabel(inspection) {
  const pageCount = inspection.pageCount ? `${inspection.pageCount} 頁` : "頁數未明";
  const textChars = Number.isFinite(inspection.textChars) ? `${inspection.textChars} 字` : "文字數未明";
  return `來源診斷：${inspection.sourceKind || "來源"}，${pageCount}，可抽取文字 ${textChars}。`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openNavigation(id) {
  const item = appointments.find((appointment) => appointment.id === id);
  if (!item) return;
  const url = `https://www.google.com/maps/search/?api=1&query=${item.hospital.lat},${item.hospital.lng}`;
  window.open(url, "_blank", "noopener");
}

function updateSyncInfo() {
  const now = new Date();
  const slots = [8, 12, 17];
  const nextHour = slots.find((hour) => now.getHours() < hour) ?? 8;
  const isTomorrow = nextHour === 8 && now.getHours() >= 17;
  elements.nextSync.textContent = `${isTomorrow ? "明日 " : ""}${String(nextHour).padStart(2, "0")}:00`;
}

function registerPwa() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js");
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function isFavorite(doctorId) {
  return state.favorites.includes(doctorId);
}

function unique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

init();
