const hospitals = [
  { id: "ncku", region: "台南", name: "成大醫院", branch: "總院", lat: 23.0015, lng: 120.2197 },
  { id: "chi-mei", region: "台南", name: "奇美醫院", branch: "永康院區", lat: 23.0202, lng: 120.2216 },
  { id: "kmuh", region: "高雄", name: "高雄醫學大學附設中和紀念醫院", branch: "總院", lat: 22.6467, lng: 120.3097 },
  { id: "cgmh-kao", region: "高雄", name: "高雄長庚紀念醫院", branch: "鳥松院區", lat: 22.6501, lng: 120.3565 },
  { id: "vghks", region: "高雄", name: "高雄榮民總醫院", branch: "左營院區", lat: 22.6774, lng: 120.3222 },
  { id: "ptch", region: "屏東", name: "屏東基督教醫院", branch: "總院", lat: 22.6751, lng: 120.4948 },
  { id: "pntn", region: "屏東", name: "衛福部屏東醫院", branch: "總院", lat: 22.6719, lng: 120.4868 }
];

const doctors = [
  { id: "d01", name: "林哲宇", department: "心臟內科", specialty: "心導管、高血壓、心衰竭", hospitalId: "ncku" },
  { id: "d02", name: "陳怡君", department: "腫瘤內科", specialty: "乳癌、標靶治療、臨床試驗", hospitalId: "ncku" },
  { id: "d03", name: "黃柏翰", department: "神經內科", specialty: "腦中風、巴金森氏症", hospitalId: "chi-mei" },
  { id: "d04", name: "蔡孟儒", department: "骨科", specialty: "人工關節、運動醫學", hospitalId: "chi-mei" },
  { id: "d05", name: "許雅婷", department: "胸腔內科", specialty: "氣喘、慢性阻塞性肺病", hospitalId: "kmuh" },
  { id: "d06", name: "吳宗憲", department: "胃腸肝膽科", specialty: "肝炎、內視鏡治療", hospitalId: "kmuh" },
  { id: "d07", name: "張維倫", department: "新陳代謝科", specialty: "糖尿病、甲狀腺疾病", hospitalId: "cgmh-kao" },
  { id: "d08", name: "劉佳穎", department: "腎臟內科", specialty: "慢性腎病、透析照護", hospitalId: "cgmh-kao" },
  { id: "d09", name: "王俊傑", department: "感染科", specialty: "抗生素管理、旅遊醫學", hospitalId: "vghks" },
  { id: "d10", name: "鄭欣怡", department: "血液腫瘤科", specialty: "淋巴癌、貧血、化療照護", hospitalId: "vghks" },
  { id: "d11", name: "邱冠廷", department: "心臟內科", specialty: "心律不整、介入治療", hospitalId: "ptch" },
  { id: "d12", name: "郭芷涵", department: "小兒科", specialty: "兒童過敏、疫苗諮詢", hospitalId: "pntn" }
];

const sessionTemplates = [
  { doctorId: "d01", weekdays: [1, 3, 5], period: "上午", room: "A203" },
  { doctorId: "d02", weekdays: [2, 4], period: "下午", room: "B118" },
  { doctorId: "d03", weekdays: [1, 4], period: "上午", room: "C302" },
  { doctorId: "d04", weekdays: [2, 5], period: "夜診", room: "D510" },
  { doctorId: "d05", weekdays: [1, 3], period: "下午", room: "12診" },
  { doctorId: "d06", weekdays: [2, 4, 6], period: "上午", room: "16診" },
  { doctorId: "d07", weekdays: [1, 5], period: "上午", room: "內科08" },
  { doctorId: "d08", weekdays: [3, 5], period: "下午", room: "內科11" },
  { doctorId: "d09", weekdays: [2, 4], period: "下午", room: "E221" },
  { doctorId: "d10", weekdays: [1, 3], period: "上午", room: "F105" },
  { doctorId: "d11", weekdays: [2, 5], period: "上午", room: "心內02" },
  { doctorId: "d12", weekdays: [1, 3, 6], period: "下午", room: "兒科06" }
];

const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];
const statusMap = {
  normal: { label: "正常開診", className: "normal" },
  cancelled: { label: "臨時停診", className: "cancelled" },
  changed: { label: "班別調動", className: "changed" },
  substitute: { label: "代診", className: "changed" }
};

const state = {
  viewedDate: new Date(),
  selectedDate: new Date(),
  selectedWeekday: null,
  filters: {
    search: "",
    region: "全部",
    hospital: "全部",
    department: "全部",
    doctor: "全部"
  },
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
  installButton: $("#installButton")
};

function buildAppointments() {
  const items = [];
  const start = new Date();
  start.setMonth(start.getMonth() - 1, 1);
  const end = new Date();
  end.setMonth(end.getMonth() + 2, 0);

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const day = date.getDay();
    sessionTemplates.forEach((template) => {
      if (!template.weekdays.includes(day)) return;
      const doctor = doctors.find((item) => item.id === template.doctorId);
      const hospital = hospitals.find((item) => item.id === doctor.hospitalId);
      const iso = toIsoDate(date);
      const marker = `${doctor.id}-${iso}`;
      let status = "normal";
      let note = "";
      let substitute = "";

      if (marker.includes("d03") && date.getDate() === 8) {
        status = "cancelled";
        note = "醫師臨時請假，官網於 08:00 同步時偵測停診。";
      } else if (marker.includes("d07") && date.getDate() === 15) {
        status = "changed";
        note = "原上午診調整為下午診，請重新安排拜訪路線。";
      } else if (marker.includes("d10") && date.getDate() === 22) {
        status = "substitute";
        note = "由李昱辰醫師代診，重點醫師追蹤已觸發提醒。";
        substitute = "李昱辰";
      } else if (date.getDay() === 5 && date.getDate() % 13 === 0) {
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
  render();
  registerPwa();
}

function bindEvents() {
  elements.doctorSearch.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim();
    render();
  });

  [
    ["regionFilter", "region"],
    ["hospitalFilter", "hospital"],
    ["departmentFilter", "department"],
    ["doctorFilter", "doctor"]
  ].forEach(([elementKey, filterKey]) => {
    elements[elementKey].addEventListener("change", (event) => {
      state.filters[filterKey] = event.target.value;
      if (filterKey === "region") state.filters.hospital = "全部";
      if (["region", "hospital"].includes(filterKey)) state.filters.department = "全部";
      if (["region", "hospital", "department"].includes(filterKey)) state.filters.doctor = "全部";
      populateFilters();
      render();
    });
  });

  $("#resetFilters").addEventListener("click", () => {
    state.filters = { search: "", region: "全部", hospital: "全部", department: "全部", doctor: "全部" };
    elements.doctorSearch.value = "";
    populateFilters();
    render();
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

function populateFilters() {
  setOptions(elements.regionFilter, ["全部", ...unique(hospitals.map((item) => item.region))], state.filters.region);

  const hospitalOptions = hospitals
    .filter((item) => state.filters.region === "全部" || item.region === state.filters.region)
    .map((item) => `${item.name} ${item.branch}`);
  setOptions(elements.hospitalFilter, ["全部", ...hospitalOptions], state.filters.hospital);

  const availableDoctors = doctors.filter((doctor) => {
    const hospital = hospitals.find((item) => item.id === doctor.hospitalId);
    return matchesRegion(hospital) && matchesHospital(hospital);
  });
  setOptions(elements.departmentFilter, ["全部", ...unique(availableDoctors.map((item) => item.department))], state.filters.department);

  const doctorOptions = availableDoctors
    .filter((doctor) => state.filters.department === "全部" || doctor.department === state.filters.department)
    .map((doctor) => doctor.name);
  setOptions(elements.doctorFilter, ["全部", ...doctorOptions], state.filters.doctor);
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
    .sort((a, b) => `${a.date}${a.period}`.localeCompare(`${b.date}${b.period}`));

  elements.selectedDateTitle.textContent = weekday === null
    ? `${formatDate(state.selectedDate)} 診次`
    : `星期${weekdayNames[weekday]}週表`;

  elements.weekdayFilter.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.weekday) === weekday);
  });

  if (!list.length) {
    elements.appointmentList.innerHTML = `<div class="empty-state">目前條件沒有診次，可調整地區、醫院、科別或醫師。</div>`;
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

function getFilteredAppointments() {
  const query = state.filters.search.toLowerCase();
  return appointments.filter((item) => {
    const hospitalLabel = `${item.hospital.name} ${item.hospital.branch}`;
    const searchPool = `${item.doctor.name} ${item.doctor.department} ${item.doctor.specialty} ${hospitalLabel}`.toLowerCase();
    return (!query || searchPool.includes(query))
      && matchesRegion(item.hospital)
      && matchesHospital(item.hospital)
      && (state.filters.department === "全部" || item.doctor.department === state.filters.department)
      && (state.filters.doctor === "全部" || item.doctor.name === state.filters.doctor);
  });
}

function matchesRegion(hospital) {
  return state.filters.region === "全部" || hospital.region === state.filters.region;
}

function matchesHospital(hospital) {
  return state.filters.hospital === "全部" || `${hospital.name} ${hospital.branch}` === state.filters.hospital;
}

function setOptions(select, options, selected) {
  select.innerHTML = options.map((option) => `<option value="${option}">${option}</option>`).join("");
  select.value = options.includes(selected) ? selected : "全部";
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
  if ("serviceWorker" in navigator) {
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
