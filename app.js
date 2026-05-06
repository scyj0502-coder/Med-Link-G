const ALL = "全部";

const hospitals = [
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
    ["許雅婷", "胸腔內科", "氣喘、慢性阻塞性肺病"],
    ["吳宗憲", "胃腸肝膽科", "肝炎、內視鏡治療"],
    ["陳冠霖", "心臟內科", "冠心症、心衰竭"],
    ["林佳穎", "血液腫瘤科", "淋巴癌、貧血、化療照護"],
    ["王紹宇", "神經外科", "腦腫瘤、脊椎手術"],
    ["蔡宜芳", "復健科", "神經復健、疼痛治療"],
    ["周育誠", "腎臟內科", "透析照護、慢性腎病"],
    ["洪珮瑜", "新陳代謝科", "糖尿病、甲狀腺疾病"],
    ["謝承翰", "感染科", "抗生素管理、發燒感染"],
    ["梁雅雯", "風濕免疫科", "紅斑性狼瘡、血管炎"],
    ["林祐任", "大腸直腸外科", "大腸癌、痔瘡、肛門疾病"],
    ["陳思涵", "放射腫瘤科", "放射治療、癌症整合照護"]
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
  "腫瘤內科": "腫內",
  "胃腸肝膽科": "肝膽",
  "肝膽腸胃科": "肝膽",
  "神經內科": "神內",
  "胸腔內科": "胸內",
  "新陳代謝科": "新陳",
  "腎臟內科": "腎內",
  "感染科": "感染",
  "血液腫瘤科": "血腫",
  "大腸直腸外科": "直腸",
  "骨科": "骨科",
  "小兒科": "兒科",
  "婦產科": "婦產",
  "泌尿科": "泌尿",
  "皮膚科": "皮膚",
  "復健科": "復健",
  "神經外科": "神外",
  "整形外科": "整外",
  "耳鼻喉科": "耳鼻",
  "眼科": "眼科",
  "放射腫瘤科": "放腫",
  "家醫科": "家醫",
  "精神科": "精神",
  "風濕免疫科": "免疫",
  "過敏免疫風濕科": "免疫"
};

const doctors = Object.entries(doctorSeed).flatMap(([hospitalId, rows]) =>
  rows.map(([name, department, specialty], index) => ({
    id: `${hospitalId}-${String(index + 1).padStart(2, "0")}`,
    name,
    department,
    specialty,
    hospitalId
  }))
);

const sessionTemplates = doctors.map((doctor, index) => ({
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
  filters: { ...defaultFilters },
  draftFilters: { ...defaultFilters },
  favorites: JSON.parse(localStorage.getItem("medlink:favorites") || "[]"),
  deferredInstallPrompt: null
};

const appointments = buildAppointments();

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
  querySummary: $("#querySummary")
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

      if (date.getDate() === 8 && index % 13 === 2) {
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
        id: `${doctor.id}-${iso}-${template.period}`,
        date: iso,
        weekday: day,
        period: status === "changed" ? "下午" : template.period,
        originalPeriod: template.period,
        room: template.room,
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

function init() {
  populateWeekdayFilter();
  populateFilters();
  bindEvents();
  updateSyncInfo();
  applyFilters(false);
  registerPwa();
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
    showToast(`已模擬推播 ${tracked.length} 則重點通知，可銜接 LINE Messaging API。`);
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
  render();
  if (announce) {
    showToast(`查詢完成：符合條件 ${getFilteredAppointments().length} 筆診次。`);
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
  updateQuerySummary(filtered);
  elements.changedCount.textContent = filtered.filter((item) => item.status !== "normal").length;
  elements.favoriteTotal.textContent = state.favorites.length;
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
    ? `${formatDate(state.selectedDate)} 診次`
    : `星期${weekdayNames[weekday]}週表`;

  elements.weekdayFilter.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.weekday) === weekday);
  });

  if (!list.length) {
    elements.appointmentList.innerHTML = `<div class="empty-state">目前條件沒有診次，可調整地區、醫院、科別或醫師後按「套用查詢」。</div>`;
    return;
  }

  elements.appointmentList.innerHTML = list.map((item) => {
    const status = statusMap[item.status];
    const favorite = isFavorite(item.doctor.id);
    return `
      <article class="appointment-card ${item.status !== "normal" ? "changed" : ""}">
        <div class="appointment-title">
          <div>
            <h3>${item.doctor.name} · ${item.doctor.department}</h3>
            <p class="appointment-meta">${item.hospital.region}｜${item.hospital.name} ${item.hospital.branch}</p>
          </div>
          <span class="status-pill ${status.className}">${status.label}</span>
        </div>
        <p class="appointment-meta">${item.date} 星期${weekdayNames[item.weekday]}｜${item.period}｜診間 ${item.room}</p>
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

function updateQuerySummary(filtered = getFilteredAppointments()) {
  const draftParts = Object.entries(state.draftFilters)
    .filter(([, value]) => value && value !== ALL)
    .map(([key, value]) => `${filterLabel(key)}：${value}`);
  const activeParts = Object.entries(state.filters)
    .filter(([, value]) => value && value !== ALL)
    .map(([key, value]) => `${filterLabel(key)}：${value}`);
  const isDirty = JSON.stringify(state.draftFilters) !== JSON.stringify(state.filters);
  const base = activeParts.length ? activeParts.join("、") : "全部院所與科別";
  elements.querySummary.textContent = isDirty
    ? `條件已變更，請按「套用查詢」。草稿：${draftParts.join("、") || "全部"}`
    : `目前顯示 ${base}，共 ${filtered.length} 筆診次。`;
}

function getFilteredAppointments() {
  const query = state.filters.search.toLowerCase();
  return appointments.filter((item) => {
    const hospitalText = hospitalLabel(item.hospital);
    const searchPool = `${item.doctor.name} ${item.doctor.department} ${item.doctor.specialty} ${hospitalText}`.toLowerCase();
    return (!query || searchPool.includes(query))
      && matchesRegion(item.hospital)
      && matchesHospital(item.hospital)
      && (state.filters.department === ALL || item.doctor.department === state.filters.department)
      && (state.filters.doctor === ALL || item.doctor.name === state.filters.doctor);
  });
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
  elements.detailDoctor.textContent = `${item.doctor.name} ${item.doctor.department}`;
  elements.detailBody.innerHTML = `
    <div class="detail-grid">
      <div><span>日期班別</span><strong>${item.date} 星期${weekdayNames[item.weekday]} ${item.period}</strong></div>
      <div><span>診間號碼</span><strong>${item.room}</strong></div>
      <div><span>醫師專長</span><strong>${item.doctor.specialty}</strong></div>
      <div><span>追蹤狀態</span><strong>${isFavorite(item.doctor.id) ? "已收藏，優先推播" : "尚未收藏"}</strong></div>
    </div>
    ${item.substitute ? `<div class="change-note">代診醫師：${item.substitute}</div>` : ""}
    ${item.note ? `<div class="change-note">${item.note}</div>` : ""}
  `;
  elements.detailDialog.showModal();
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
