(() => {
  "use strict";

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const HIJRI_MONTH_NAMES = [
    "Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani",
    "Jumada al-awwal", "Jumada al-thani", "Rajab", "Sha'ban",
    "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
  ];

  function gregorianToHijri(gregorianDate) {
    try {
      const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      }).formatToParts(gregorianDate);

      const year = parseInt(parts.find(p => p.type === 'year').value, 10);
      const month = parseInt(parts.find(p => p.type === 'month').value, 10);
      const day = parseInt(parts.find(p => p.type === 'day').value, 10);

      return { year, month, day };
    } catch (e) {
      console.error("Hijri conversion failed", e);
      // Fallback for environments that might not support umalqura calendar
      return { year: 0, month: 0, day: 0 };
    }
  }

  function formatHijriDate(hijri) {
    if (!hijri || hijri.year === 0) return ''; // Don't display anything if conversion failed
    const day = String(hijri.day).padStart(2, '0');
    // Handle potential missing month name, though with Intl it should be reliable
    const monthName = HIJRI_MONTH_NAMES[hijri.month - 1] ? HIJRI_MONTH_NAMES[hijri.month - 1] : '';
    return `${day} ${monthName} ${hijri.year}`;
  }

  function getStartOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  function getEndOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
  function toISODateString(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  const STORAGE_KEY = "simple_calendar_events_v1";
  function loadAllEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
      return {};
    } catch (_) {
      return {};
    }
  }
  function saveAllEvents(map) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }
  function getEventsForDate(isoDate, all) {
    return Array.isArray(all[isoDate]) ? all[isoDate] : [];
  }
  function addEvent(isoDate, text, opts = {}) {
    const all = loadAllEvents();
    const events = getEventsForDate(isoDate, all);
    const event = {
      id: crypto.randomUUID(),
      text,
      timeHour: typeof opts.timeHour === "number" ? opts.timeHour : null,
      repeat: opts.repeat || "none",
      origin: isoDate
    };
    const updated = [...events, event];
    all[isoDate] = updated;
    saveAllEvents(all);
    return updated;
  }
  function removeEvent(isoDate, id) {
    const all = loadAllEvents();
    const events = getEventsForDate(isoDate, all).filter(e => e.id !== id);
    all[isoDate] = events;
    saveAllEvents(all);
    return events;
  }

  function updateEvent(originIso, id, updates) {
    const all = loadAllEvents();
    const list = getEventsForDate(originIso, all);
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) return null;
    const existing = list[idx];
    const updated = {
      ...existing,
      text: typeof updates.text === "string" ? updates.text : existing.text,
      timeHour: updates.timeHour !== undefined ? updates.timeHour : existing.timeHour,
      repeat: updates.repeat || existing.repeat
    };
    list[idx] = updated;
    all[originIso] = list;
    saveAllEvents(all);
    return updated;
  }

  function matchesRecurrence(originDate, targetDate, repeat) {
    if (repeat === "none") return false;
    if (targetDate < originDate) return false;
    switch (repeat) {
      case "daily":
        return true;
      case "weekly":
        return originDate.getDay() === targetDate.getDay();
      case "monthly":
        return originDate.getDate() === targetDate.getDate();
      case "yearly":
        return originDate.getMonth() === targetDate.getMonth() && originDate.getDate() === targetDate.getDate();
      default:
        return false;
    }
  }

  function getEventsForDisplay(dateObj) {
    const all = loadAllEvents();
    const targetIso = toISODateString(dateObj);
    const direct = (all[targetIso] || []).map(e => ({ ...e, originIso: targetIso }));
    const extras = [];
    for (const [iso, list] of Object.entries(all)) {
      if (iso === targetIso) continue;
      for (const e of list) {
        const repeat = e.repeat || "none";
        if (repeat === "none") continue;
        const originDate = new Date(iso);
        if (matchesRecurrence(originDate, dateObj, repeat)) {
          extras.push({ ...e, originIso: iso });
        }
      }
    }
    const combined = [...direct, ...extras];
    combined.sort((a, b) => {
      const ah = typeof a.timeHour === "number" ? a.timeHour : 99;
      const bh = typeof b.timeHour === "number" ? b.timeHour : 99;
      return ah - bh;
    });
    return combined;
  }

  const titleEl = document.getElementById("calendar-heading");
  const gridEl = document.getElementById("calendarGrid");
  const weekdaysHeader = document.getElementById("weekdaysHeader");
  const prevBtn = document.getElementById("prevMonthBtn");
  const nextBtn = document.getElementById("nextMonthBtn");
  const todayBtn = document.getElementById("todayBtn");
  const jumpInput = document.getElementById("jumpToMonth");
  const goToDateInput = document.getElementById("goToDate");
  const goToDateBtn = document.getElementById("goToDateBtn");
  const viewMonthBtn = document.getElementById("viewMonthBtn");
  const viewDayBtn = document.getElementById("viewDayBtn");
  const viewYearBtn = document.getElementById("viewYearBtn");
  const dayViewEl = document.getElementById("dayView");
  const yearViewEl = document.getElementById("yearView");
  // Removed sidebar elements - now using modal only
  // Modal elements
  const dayModal = document.getElementById("dayModal");
  const dayModalTitle = document.getElementById("dayModalTitle");
  const dayModalDate = document.getElementById("dayModalDate");
  const dayModalList = document.getElementById("dayModalList");
  const dayModalInput = document.getElementById("dayModalInput");
  const dayModalForm = document.getElementById("dayModalForm");
  const closeDayModalBtn = document.getElementById("closeDayModal");

  const state = {
    visibleMonthDate: getStartOfMonth(new Date()),
    selectedDate: new Date(),
    view: "month" // 'month' | 'day' | 'year'
  };

  function render() {
    renderToolbar();
    if (state.view === "month") {
      if (weekdaysHeader) weekdaysHeader.removeAttribute("hidden");
      if (gridEl) gridEl.removeAttribute("hidden");
      if (dayViewEl) dayViewEl.setAttribute("hidden", "");
      if (yearViewEl) yearViewEl.setAttribute("hidden", "");
      renderGrid();
      renderSelectedDay();
    } else if (state.view === "day") {
      if (weekdaysHeader) weekdaysHeader.setAttribute("hidden", "");
      if (gridEl) gridEl.setAttribute("hidden", "");
      if (yearViewEl) yearViewEl.setAttribute("hidden", "");
      if (dayViewEl) dayViewEl.removeAttribute("hidden");
      renderDayView();
    } else if (state.view === "year") {
      if (weekdaysHeader) weekdaysHeader.setAttribute("hidden", "");
      if (gridEl) gridEl.setAttribute("hidden", "");
      if (dayViewEl) dayViewEl.setAttribute("hidden", "");
      if (yearViewEl) yearViewEl.removeAttribute("hidden");
      renderYearView();
    }
  }

  function renderToolbar() {
    const y = state.visibleMonthDate.getFullYear();
    const m = state.visibleMonthDate.getMonth();
    if (state.view === "month") {
      titleEl.textContent = `${MONTH_NAMES[m]} ${y}`;
    } else if (state.view === "day") {
      const d = state.selectedDate;
      titleEl.textContent = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    } else if (state.view === "year") {
      titleEl.textContent = `${y}`;
    }
    jumpInput.value = `${y}-${String(m + 1).padStart(2, "0")}`;
  }

  function parseEventHour(text) {
    const m = text.match(/^\s*(?:\[)?(\d{1,2})(?::(\d{2}))?(?:\])?\s*-?\s*(.*)$/);
    if (!m) return { hour: null, label: text };
    const hour = Number(m[1]);
    if (Number.isNaN(hour) || hour < 0 || hour > 23) return { hour: null, label: text };
    const label = m[3] ? m[3] : text;
    return { hour, label };
  }

  function renderDayView() {
    if (!dayViewEl) return;
    dayViewEl.innerHTML = "";
    const container = document.createElement("div");
    container.className = "day-view__grid";
    const date = state.selectedDate;
    const iso = toISODateString(date);
    const events = getEventsForDate(iso, loadAllEvents()).map(e => {
      const parsed = parseEventHour(e.text);
      return { ...e, timeHour: parsed.hour, label: parsed.label || e.text };
    });
    for (let hour = 0; hour < 24; hour++) {
      const row = document.createElement("div");
      row.className = "day-view__row";
      const label = document.createElement("div");
      label.className = "day-view__time";
      label.textContent = `${String(hour).padStart(2, "0")}:00`;
      const slot = document.createElement("div");
      slot.className = "day-view__slot";
      const evsHere = events.filter(e => e.timeHour === hour);
      for (const e of evsHere) {
        const chip = document.createElement("div");
        chip.className = "event-chip";
        chip.textContent = e.label;
        slot.appendChild(chip);
      }
      row.appendChild(label);
      row.appendChild(slot);
      container.appendChild(row);
    }
    const allDay = events.filter(e => e.timeHour === null);
    if (allDay.length) {
      const allDayWrap = document.createElement("div");
      allDayWrap.className = "day-view__allday";
      const allDayTitle = document.createElement("div");
      allDayTitle.className = "day-view__allday-title";
      allDayTitle.textContent = "All day";
      const allDayList = document.createElement("div");
      allDayList.className = "day-view__allday-list";
      for (const e of allDay) {
        const chip = document.createElement("div");
        chip.className = "event-chip";
        chip.textContent = e.label;
        allDayList.appendChild(chip);
      }
      allDayWrap.appendChild(allDayTitle);
      allDayWrap.appendChild(allDayList);
      dayViewEl.appendChild(allDayWrap);
    }
    dayViewEl.appendChild(container);
  }

  function renderYearView() {
    if (!yearViewEl) return;
    yearViewEl.innerHTML = "";
    const y = state.visibleMonthDate.getFullYear();
    const wrapper = document.createElement("div");
    wrapper.className = "year-view__grid";
    for (let m = 0; m < 12; m++) {
      const card = document.createElement("div");
      card.className = "year-view__month";
      const header = document.createElement("div");
      header.className = "year-view__month-header";
      header.textContent = MONTH_NAMES[m];
      const mini = document.createElement("div");
      mini.className = "year-view__mini-grid";
      const w = ["S","M","T","W","T","F","S"];
      const wk = document.createElement("div");
      wk.className = "year-view__mini-weekdays";
      for (const d of w) { const wd = document.createElement("div"); wd.textContent = d; wk.appendChild(wd); }
      mini.appendChild(wk);
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      const start = new Date(first); start.setDate(first.getDate() - first.getDay());
      const end = new Date(last); end.setDate(last.getDate() + (6 - last.getDay()));
      const days = document.createElement("div");
      days.className = "year-view__mini-days";
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const cell = document.createElement("div");
        cell.className = "year-view__mini-day" + (d.getMonth() === m ? "" : " year-view__mini-day--muted");
        cell.textContent = String(d.getDate());
        cell.addEventListener("click", () => {
          state.selectedDate = new Date(d);
          state.visibleMonthDate = new Date(y, m, 1);
          state.view = "day";
          render();
        });
        days.appendChild(cell);
      }
      mini.appendChild(days);
      card.appendChild(header);
      card.appendChild(mini);
      wrapper.appendChild(card);
    }
    yearViewEl.appendChild(wrapper);
  }

  function renderGrid() {
    gridEl.innerHTML = "";

    const firstDay = getStartOfMonth(state.visibleMonthDate);
    const lastDay = getEndOfMonth(state.visibleMonthDate);

    const startGridDate = new Date(firstDay);
    startGridDate.setDate(firstDay.getDate() - firstDay.getDay());

    const endGridDate = new Date(lastDay);
    endGridDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

    const today = new Date();

    for (let d = new Date(startGridDate); d <= endGridDate; d.setDate(d.getDate() + 1)) {
      const day = new Date(d.getTime());
      const cell = document.createElement("div");
      cell.className = "day-cell";
      cell.setAttribute("role", "gridcell");
      cell.tabIndex = 0;

      const isOtherMonth = day.getMonth() !== state.visibleMonthDate.getMonth();
      const isToday = isSameDay(day, today);
      const isSelected = isSameDay(day, state.selectedDate);
      if (isSelected) {
        cell.classList.add("day-cell--selected");
      }

      const header = document.createElement("div");
      header.className = "day-cell__header";

      const dateLabel = document.createElement("div");
      dateLabel.className = "day-cell__date" + (isOtherMonth ? " day-cell__other-month" : "") + (isToday ? " day-cell__today" : "");
      dateLabel.textContent = String(day.getDate());

      const hijriDate = gregorianToHijri(day);
      const hijriLabel = document.createElement("div");
      hijriLabel.className = "day-cell__hijri" + (isOtherMonth ? " day-cell__other-month" : "");
      hijriLabel.textContent = formatHijriDate(hijriDate);

      const eventsPill = document.createElement("div");
      eventsPill.className = "pill";
      const iso = toISODateString(day);
      const count = getEventsForDate(iso, loadAllEvents()).length;
      eventsPill.textContent = count === 1 ? "1 event" : `${count} events`;

      header.appendChild(dateLabel);
      header.appendChild(hijriLabel);

      const controls = document.createElement("div");
      controls.className = "day-cell__controls";
      controls.appendChild(eventsPill);

      const eventsPreview = document.createElement("div");
      const events = getEventsForDisplay(day).slice(0, 2);
      for (const e of events) {
        const chip = document.createElement("span");
        chip.className = "event-chip";
        const time = typeof e.timeHour === "number" ? `${String(e.timeHour).padStart(2, "0")}:00 ` : "";
        chip.title = `${time}${e.text}`;
        chip.textContent = `${time}${e.text}`;
        eventsPreview.appendChild(chip);
      }

      cell.appendChild(header);
      cell.appendChild(controls);
      cell.appendChild(eventsPreview);

      cell.addEventListener("click", () => {
        state.selectedDate = new Date(day.getTime());
        render();
        openDayModal(state.selectedDate, cell);
      });
      cell.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          state.selectedDate = new Date(day.getTime());
          render();
          openDayModal(state.selectedDate, cell);
        }
      });

      gridEl.appendChild(cell);
    }
  }
  function renderSelectedDay() {
    // Sidebar removed - events now only show in modal
  }

  prevBtn.addEventListener("click", () => {
    const d = state.visibleMonthDate;
    state.visibleMonthDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    render();
  });
  nextBtn.addEventListener("click", () => {
    const d = state.visibleMonthDate;
    state.visibleMonthDate = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    render();
  });
  todayBtn.addEventListener("click", () => {
    const today = new Date();
    state.visibleMonthDate = getStartOfMonth(today);
    state.selectedDate = today;
    render();
  });
  jumpInput.addEventListener("change", () => {
    if (!jumpInput.value) return;
    const [y, m] = jumpInput.value.split("-").map(Number);
    state.visibleMonthDate = new Date(y, m - 1, 1);
    render();
  });

  function goToSpecificDate(isoStr) {
    if (!isoStr) return;
    const [yStr, mStr, dStr] = isoStr.split("-");
    const y = Number(yStr);
    const m = Number(mStr) - 1;
    const d = Number(dStr);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return;
    const target = new Date(y, m, d);
    if (Number.isNaN(target.getTime())) return;
    state.visibleMonthDate = getStartOfMonth(target);
    state.selectedDate = target;
    render();
  }

  if (goToDateBtn && goToDateInput) {
    goToDateBtn.addEventListener("click", () => {
      goToSpecificDate(goToDateInput.value);
    });
    goToDateInput.addEventListener("change", () => {
      goToSpecificDate(goToDateInput.value);
    });
    goToDateInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        goToSpecificDate(goToDateInput.value);
      }
    });
  }
  // Sidebar form removed - now using modal only

  // View switching
  if (viewMonthBtn) viewMonthBtn.addEventListener("click", () => { state.view = "month"; render(); });
  if (viewDayBtn) viewDayBtn.addEventListener("click", () => { state.view = "day"; render(); });
  if (viewYearBtn) viewYearBtn.addEventListener("click", () => { state.view = "year"; render(); });

  function openDayModal(date, anchorEl) {
    if (!dayModal) return;
    dayModal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    renderDayModal(date);
    // Centered modal: no anchor positioning
  }
  function closeDayModal() {
    if (!dayModal) return;
    dayModal.setAttribute("hidden", "");
    document.body.style.overflow = "";
    document.body.classList.remove("modal-open");
  }
  function renderDayModal(date) {
    const iso = toISODateString(date);
    const hijriDate = gregorianToHijri(date);
    const formattedHijri = formatHijriDate(hijriDate);
    if (dayModalTitle) dayModalTitle.textContent = `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} (${formattedHijri})`
    if (dayModalDate) dayModalDate.textContent = iso;
    if (dayModalList) {
      dayModalList.innerHTML = "";
      const events = getEventsForDate(iso, loadAllEvents());
      for (const e of events) {
        const li = document.createElement("li");
        const text = document.createElement("span");
        const time = typeof e.timeHour === "number" ? `${String(e.timeHour).padStart(2, "0")}:00 ` : "";
        text.textContent = `${time}${e.text}` + (e.repeat && e.repeat !== "none" ? " ⟳" : "");
        text.className = "event-chip";
        const editBtn = document.createElement("button");
        editBtn.className = "btn";
        editBtn.type = "button";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
          openEditPrompt(e, iso);
        });
        const removeBtn = document.createElement("button");
        removeBtn.className = "btn btn--danger";
        removeBtn.type = "button";
        removeBtn.setAttribute("aria-label", "Remove event");
        removeBtn.textContent = "Delete";
        removeBtn.addEventListener("click", () => {
          removeEvent(iso, e.id);
          render();
          renderDayModal(date);
        });
        li.appendChild(text);
        li.appendChild(editBtn);
        li.appendChild(removeBtn);
        dayModalList.appendChild(li);
      }
    }
    if (dayModalInput) {
      dayModalInput.value = "";
      dayModalInput.placeholder = `Add an event for ${iso}`;
      setTimeout(() => dayModalInput.focus(), 0);
    }
  }

  if (closeDayModalBtn) closeDayModalBtn.addEventListener("click", closeDayModal);
  if (dayModal) {
    dayModal.addEventListener("click", (ev) => {
      const target = ev.target;
      if (target && target.getAttribute && target.getAttribute("data-close") === "true") {
        closeDayModal();
      }
    });
    window.addEventListener("keydown", (ev) => {
      if (!dayModal.hasAttribute("hidden") && ev.key === "Escape") closeDayModal();
    });
  }
  if (dayModalForm && dayModalInput) {
    const dayModalTime = document.getElementById("dayModalTime");
    const dayModalRepeat = document.getElementById("dayModalRepeat");
    dayModalForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const text = dayModalInput.value.trim();
      if (!text) return;
      const iso = toISODateString(state.selectedDate);
      let timeHour = null;
      if (dayModalTime && dayModalTime.value) {
        const [hh, mm] = dayModalTime.value.split(":").map(Number);
        if (!Number.isNaN(hh)) timeHour = hh;
      }
      const repeat = dayModalRepeat && dayModalRepeat.value ? dayModalRepeat.value : "none";
      addEvent(iso, text, { timeHour, repeat });
      render();
      renderDayModal(state.selectedDate);
    });
  }

  function openEditPrompt(eventObj, fallbackIso) {
    const originIso = eventObj.originIso || fallbackIso;
    const currentText = eventObj.text;
    const currentTime = typeof eventObj.timeHour === "number" ? String(eventObj.timeHour).padStart(2, "0") + ":00" : "";
    const currentRepeat = eventObj.repeat || "none";
    const newText = window.prompt("Edit title", currentText);
    if (newText === null) return;
    let newTimeHour = eventObj.timeHour;
    const timeInput = window.prompt("Edit time (HH:MM) or leave blank for all-day", currentTime);
    if (timeInput !== null) {
      if (timeInput.trim() === "") {
        newTimeHour = null;
      } else {
        const [hh] = timeInput.split(":").map(Number);
        if (!Number.isNaN(hh) && hh >= 0 && hh <= 23) newTimeHour = hh;
      }
    }
    const newRepeat = window.prompt("Repeat (none/daily/weekly/monthly/yearly)", currentRepeat) || currentRepeat;
    updateEvent(originIso, eventObj.id, { text: newText.trim(), timeHour: newTimeHour, repeat: newRepeat });
    render();
    if (!dayModal.hasAttribute("hidden")) {
      renderDayModal(state.selectedDate);
    }
  }

  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeLabel = document.getElementById("theme-label");

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
      if (themeLabel) themeLabel.textContent = 'Light Mode';
    } else {
      document.body.classList.remove('light-mode');
      if (themeLabel) themeLabel.textContent = 'Dark Mode';
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const isLight = document.body.classList.contains('light-mode');
      const newTheme = isLight ? 'dark' : 'light';
      localStorage.setItem('calendar_theme', newTheme);
      applyTheme(newTheme);
    });
  }

  // On page load, apply saved theme
  const savedTheme = localStorage.getItem('calendar_theme') || 'dark';
  applyTheme(savedTheme);

  render();
})();