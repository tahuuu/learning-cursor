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
      isAllDay: opts.isAllDay || false,
      startTime: opts.startTime || null,
      endTime: opts.endTime || null,
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
      isAllDay: typeof updates.isAllDay === "boolean" ? updates.isAllDay : existing.isAllDay,
      startTime: updates.startTime !== undefined ? updates.startTime : existing.startTime,
      endTime: updates.endTime !== undefined ? updates.endTime : existing.endTime,
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
      if (a.isAllDay) return -1;
      if (b.isAllDay) return 1;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      const aTime = a.startTime.hour * 60 + a.startTime.minute;
      const bTime = b.startTime.hour * 60 + b.startTime.minute;
      return aTime - bTime;
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
  const syncBtn = document.getElementById("syncBtn");
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
  const dayModalTime = document.getElementById("dayModalTime");
  const dayModalRepeat = document.getElementById("dayModalRepeat");
  const dayModalStartTime = document.getElementById("dayModalStartTime");
  const dayModalEndTime = document.getElementById("dayModalEndTime");
  const dayModalAllDay = document.getElementById("dayModalAllDay");

  const state = {
    visibleMonthDate: getStartOfMonth(new Date()),
    selectedDate: new Date(),
    view: "month" // 'month' | 'day' | 'year'
  };

  function render() {
    renderToolbar();

    weekdaysHeader.hidden = state.view !== "month";
    gridEl.hidden = state.view !== "month";
    dayViewEl.hidden = state.view !== "day";
    yearViewEl.hidden = state.view !== "year";

    if (state.view === "month") {
      renderGrid();
      renderSelectedDay();
    } else if (state.view === "day") {
      renderDayView();
    } else if (state.view === "year") {
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

    // Update active class on view switcher buttons
    viewMonthBtn.classList.toggle("is-active", state.view === "month");
    viewDayBtn.classList.toggle("is-active", state.view === "day");
    viewYearBtn.classList.toggle("is-active", state.view === "year");
  }



  function renderDayView() {
    if (!dayViewEl) return;
    dayViewEl.innerHTML = "";
    const container = document.createElement("div");
    container.className = "day-view__grid";
    const date = state.selectedDate;
    const events = getEventsForDisplay(date);

    for (let i = 0; i < 48; i++) {
      const hour = Math.floor(i / 2);
      const minute = (i % 2) * 30;

      const row = document.createElement("div");
      row.className = "day-view__row";
      row.addEventListener("click", () => {
        openDayModal(state.selectedDate, null, hour, minute);
      });

      const label = document.createElement("div");
      label.className = "day-view__time";
      label.textContent = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      
      const slot = document.createElement("div");
      slot.className = "day-view__slot";

      const evsHere = events.filter(e => {
        if (e.isAllDay || !e.startTime) return false;
        const eventStart = e.startTime.hour * 60 + e.startTime.minute;
        const eventEnd = e.endTime ? e.endTime.hour * 60 + e.endTime.minute : eventStart + 30;
        const slotStart = hour * 60 + minute;
        const slotEnd = slotStart + 30;
        return slotStart < eventEnd && slotEnd > eventStart;
      });

      for (const e of evsHere) {
        const chip = document.createElement("div");
        chip.className = "event-chip";
        chip.textContent = e.text;
        chip.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openEditPrompt(e, toISODateString(date));
        });
        slot.appendChild(chip);
      }

      row.appendChild(label);
      row.appendChild(slot);
      container.appendChild(row);
    }

    const allDay = events.filter(e => e.isAllDay);
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
        chip.textContent = e.text;
        chip.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openEditPrompt(e, toISODateString(date));
        });
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
    const allEvents = loadAllEvents();

    const firstDay = getStartOfMonth(state.visibleMonthDate);
    const lastDay = getEndOfMonth(state.visibleMonthDate);

    const startGridDate = new Date(firstDay);
    startGridDate.setDate(firstDay.getDate() - firstDay.getDay());

    const endGridDate = new Date(lastDay);
    endGridDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

    const today = new Date();
    const fragment = document.createDocumentFragment();

    for (let d = new Date(startGridDate); d <= endGridDate; d.setDate(d.getDate() + 1)) {
      const day = new Date(d.getTime());
      const cell = document.createElement("div");
      cell.className = "day-cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.date = toISODateString(day);

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
      const count = getEventsForDate(iso, allEvents).length;
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
        const h = e.timeHour;
        const m = e.timeMinute;
        const time = typeof h === "number" ? `${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ` : "";
        chip.title = `${time}${e.text}`;
        chip.textContent = `${time}${e.text}`;
        eventsPreview.appendChild(chip);
      }

      cell.appendChild(header);
      cell.appendChild(controls);
      cell.appendChild(eventsPreview);
      
      cell.tabIndex = 0;
      fragment.appendChild(cell);
    }
    gridEl.appendChild(fragment);
  }
  function renderSelectedDay() {
    // Sidebar removed - events now only show in modal
  }

  gridEl.addEventListener("click", (ev) => {
    const cell = ev.target.closest(".day-cell");
    if (!cell || !cell.dataset.date) return;
    const date = new Date(cell.dataset.date + "T00:00:00"); // Ensure parsing as local time
    state.selectedDate = date;
    render();
    openDayModal(date, cell);
  });

  gridEl.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const cell = ev.target.closest(".day-cell");
    if (!cell || !cell.dataset.date) return;

    ev.preventDefault();
    const date = new Date(cell.dataset.date + "T00:00:00"); // Ensure parsing as local time
    state.selectedDate = date;
    render();
    openDayModal(date, cell);
  });

  prevBtn.addEventListener("click", () => {
    gridEl.classList.add("slide-out-right");
    setTimeout(() => {
      const d = state.visibleMonthDate;
      state.visibleMonthDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      render();
      gridEl.classList.remove("slide-out-right");
      gridEl.classList.add("slide-in-left");
      setTimeout(() => gridEl.classList.remove("slide-in-left"), 300);
    }, 300);
  });
  nextBtn.addEventListener("click", () => {
    gridEl.classList.add("slide-out-left");
    setTimeout(() => {
      const d = state.visibleMonthDate;
      state.visibleMonthDate = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      render();
      gridEl.classList.remove("slide-out-left");
      gridEl.classList.add("slide-in-right");
      setTimeout(() => gridEl.classList.remove("slide-in-right"), 300);
    }, 300);
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
  if (viewDayBtn) viewDayBtn.addEventListener("click", () => { state.view = "day"; render(); dayViewEl.scrollIntoView({ behavior: 'smooth' }); });
  if (viewYearBtn) viewYearBtn.addEventListener("click", () => { state.view = "year"; render(); yearViewEl.scrollIntoView({ behavior: 'smooth' }); });

  function openDayModal(date, anchorEl, hour = null, minute = 0) {
    if (!dayModal) return;
    dayModal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    renderDayModal(date);

    const timeInputs = [dayModalStartTime, dayModalEndTime];

    function handleAllDayChange() {
      const isAllDay = dayModalAllDay.checked;
      timeInputs.forEach(input => {
        if (input) {
          input.disabled = isAllDay;
          if (isAllDay) {
            input.value = "";
          }
        }
      });
    }

    if (dayModalAllDay) {
      dayModalAllDay.checked = false; // Reset checkbox
      dayModalAllDay.removeEventListener("change", handleAllDayChange);
      dayModalAllDay.addEventListener("change", handleAllDayChange);
    }

    if (dayModalStartTime) {
      if (typeof hour === "number") {
        dayModalStartTime.value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      } else {
        dayModalStartTime.value = "";
      }
    }
    if (dayModalEndTime) {
      dayModalEndTime.value = "";
    }

    handleAllDayChange(); // Initial call to set state
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
        let time = "";
        if (e.isAllDay) {
          time = "All Day";
        } else if (e.startTime) {
          const start = `${String(e.startTime.hour).padStart(2, "0")}:${String(e.startTime.minute).padStart(2, "0")}`;
          const end = e.endTime ? ` - ${String(e.endTime.hour).padStart(2, "0")}:${String(e.endTime.minute).padStart(2, "0")}` : "";
          time = `${start}${end}`;
        }
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
    dayModalForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const text = dayModalInput.value.trim();
      if (!text) return;
      const iso = toISODateString(state.selectedDate);
      const isAllDay = dayModalAllDay.checked;

      let startTime = null;
      let endTime = null;

      if (!isAllDay) {
        if (dayModalStartTime.value) {
          const [hour, minute] = dayModalStartTime.value.split(":").map(Number);
          startTime = { hour, minute };
        }
        if (dayModalEndTime.value) {
          const [hour, minute] = dayModalEndTime.value.split(":").map(Number);
          endTime = { hour, minute };
        }
      }

      const repeat = dayModalRepeat && dayModalRepeat.value ? dayModalRepeat.value : "none";
      addEvent(iso, text, { isAllDay, startTime, endTime, repeat });
      render();
      renderDayModal(state.selectedDate);
    });
  }

  function openEditPrompt(eventObj, fallbackIso) {
    const originIso = eventObj.originIso || fallbackIso;

    // Pre-fill the modal with the event's data
    dayModalInput.value = eventObj.text;
    dayModalAllDay.checked = eventObj.isAllDay || false;

    if (eventObj.startTime) {
      dayModalStartTime.value = `${String(eventObj.startTime.hour).padStart(2, "0")}:${String(eventObj.startTime.minute).padStart(2, "0")}`;
    } else {
      dayModalStartTime.value = "";
    }

    if (eventObj.endTime) {
      dayModalEndTime.value = `${String(eventObj.endTime.hour).padStart(2, "0")}:${String(eventObj.endTime.minute).padStart(2, "0")}`;
    } else {
      dayModalEndTime.value = "";
    }

    dayModalRepeat.value = eventObj.repeat || "none";

    // Change the form's submit handler to update the event instead of creating a new one
    const newSubmitHandler = (ev) => {
      ev.preventDefault();
      const newText = dayModalInput.value.trim();
      if (!newText) return;

      const isAllDay = dayModalAllDay.checked;
      let startTime = null;
      let endTime = null;

      if (!isAllDay) {
        if (dayModalStartTime.value) {
          const [hour, minute] = dayModalStartTime.value.split(":").map(Number);
          startTime = { hour, minute };
        }
        if (dayModalEndTime.value) {
          const [hour, minute] = dayModalEndTime.value.split(":").map(Number);
          endTime = { hour, minute };
        }
      }

      const newRepeat = dayModalRepeat.value;

      updateEvent(originIso, eventObj.id, { text: newText, isAllDay, startTime, endTime, repeat: newRepeat });

      // Restore the original form handler and close the modal
      dayModalForm.removeEventListener("submit", newSubmitHandler);
      dayModalForm.addEventListener("submit", originalSubmitHandler);
      closeDayModal();
      render();
    };

    // Temporarily replace the form's submit handler
    const originalSubmitHandler = dayModalForm._submitHandler;
    if (originalSubmitHandler) {
        dayModalForm.removeEventListener("submit", originalSubmitHandler);
    }
    dayModalForm.addEventListener("submit", newSubmitHandler);
    dayModalForm._submitHandler = newSubmitHandler; // Store the new handler so it can be removed

    openDayModal(new Date(originIso + "T00:00:00"));
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

  function updateClock() {
    const clockEl = document.getElementById('clock');
    if (!clockEl) return;

    const now = new Date();
    // Use Intl.DateTimeFormat for robust timezone handling
    const timeString = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    }).format(now);

    clockEl.textContent = `${timeString} WIB`;
  }

  setInterval(updateClock, 1000);
  updateClock(); // initial call

  async function syncIndonesianHolidays() {
    const year = state.visibleMonthDate.getFullYear();
    const syncedYearsKey = "synced_holiday_years";

    try {
      const syncedYears = JSON.parse(localStorage.getItem(syncedYearsKey) || "[]");
      if (syncedYears.includes(year)) {
        alert(`Holidays for ${year} have already been synced.`);
        return;
      }

      const response = await fetch(`https://libur.deno.dev/api?year=${year}`);
      if (!response.ok) {
        alert(`Failed to fetch Indonesian holidays for ${year}.`);
        return;
      }

      const holidays = await response.json();
      if (!Array.isArray(holidays) || holidays.length === 0) {
        alert(`No holiday data found for ${year}. The API may not have data for this year yet.`);
        return;
      }

      const allEvents = loadAllEvents();
      let newEventsAdded = 0;

      holidays.forEach(holiday => {
        const isoDate = holiday.date;
        const eventText = holiday.name;
        const eventsOnDate = getEventsForDate(isoDate, allEvents);
        const alreadyExists = eventsOnDate.some(e => e.text === eventText && e.isAllDay);

        if (!alreadyExists) {
          addEvent(isoDate, eventText, { isAllDay: true });
          newEventsAdded++;
        }
      });

      if (newEventsAdded > 0) {
        alert(`Successfully added ${newEventsAdded} new holiday(s) for ${year}.`);
        syncedYears.push(year);
        localStorage.setItem(syncedYearsKey, JSON.stringify(syncedYears));
        render();
      } else {
        alert(`Holiday events for ${year} are already up to date.`);
        // Still mark as synced even if no new events were added
        if (!syncedYears.includes(year)) {
          syncedYears.push(year);
          localStorage.setItem(syncedYearsKey, JSON.stringify(syncedYears));
        }
      }
    } catch (error) {
      console.error(`Error syncing Indonesian holidays for ${year}:`, error);
      alert(`An error occurred while syncing holidays for ${year}.`);
    }
  }

  if (syncBtn) {
    syncBtn.addEventListener("click", syncIndonesianHolidays);
  }

  render();
})();