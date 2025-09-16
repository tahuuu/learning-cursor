(() => {
  "use strict";

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

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
  function addEvent(isoDate, text) {
    const all = loadAllEvents();
    const events = getEventsForDate(isoDate, all);
    const updated = [...events, { id: crypto.randomUUID(), text }];
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

  const state = {
    visibleMonthDate: getStartOfMonth(new Date()),
    selectedDate: new Date()
  };

  const titleEl = document.getElementById("calendar-heading");
  const gridEl = document.getElementById("calendarGrid");
  const prevBtn = document.getElementById("prevMonthBtn");
  const nextBtn = document.getElementById("nextMonthBtn");
  const todayBtn = document.getElementById("todayBtn");
  const jumpInput = document.getElementById("jumpToMonth");
  const goToDateInput = document.getElementById("goToDate");
  const goToDateBtn = document.getElementById("goToDateBtn");
  const selectedDateLabel = document.getElementById("selectedDateLabel");
  const eventsList = document.getElementById("eventsList");
  const eventForm = document.getElementById("eventForm");
  const eventTextInput = document.getElementById("eventText");
  // Modal elements
  const dayModal = document.getElementById("dayModal");
  const dayModalTitle = document.getElementById("dayModalTitle");
  const dayModalDate = document.getElementById("dayModalDate");
  const dayModalList = document.getElementById("dayModalList");
  const dayModalInput = document.getElementById("dayModalInput");
  const dayModalForm = document.getElementById("dayModalForm");
  const closeDayModalBtn = document.getElementById("closeDayModal");

  function render() {
    renderToolbar();
    renderGrid();
    renderSelectedDay();
  }
  function renderToolbar() {
    const y = state.visibleMonthDate.getFullYear();
    const m = state.visibleMonthDate.getMonth();
    titleEl.textContent = `${MONTH_NAMES[m]} ${y}`;
    jumpInput.value = `${y}-${String(m + 1).padStart(2, "0")}`;
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

      const eventsPill = document.createElement("div");
      eventsPill.className = "pill";
      const iso = toISODateString(day);
      const count = getEventsForDate(iso, loadAllEvents()).length;
      eventsPill.textContent = count === 1 ? "1 event" : `${count} events`;

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn--ghost btn--xs";
      addBtn.setAttribute("aria-label", "Add event on this day");
      addBtn.textContent = "+";

      addBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const targetDate = new Date(day.getTime());
        const isoTarget = toISODateString(targetDate);
        const text = window.prompt(`Add event for ${isoTarget}`);
        if (text && text.trim()) {
          addEvent(isoTarget, text.trim());
          state.selectedDate = targetDate;
          state.visibleMonthDate = getStartOfMonth(targetDate);
          render();
        }
      });

      header.appendChild(dateLabel);

      const controls = document.createElement("div");
      controls.className = "day-cell__controls";
      controls.appendChild(eventsPill);
      controls.appendChild(addBtn);

      const eventsPreview = document.createElement("div");
      const events = getEventsForDate(iso, loadAllEvents()).slice(0, 2);
      for (const e of events) {
        const chip = document.createElement("span");
        chip.className = "event-chip";
        chip.title = e.text;
        chip.textContent = e.text;
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
    const iso = toISODateString(state.selectedDate);
    selectedDateLabel.textContent = `${MONTH_NAMES[state.selectedDate.getMonth()]} ${state.selectedDate.getDate()}, ${state.selectedDate.getFullYear()}`;

    eventsList.innerHTML = "";
    const events = getEventsForDate(iso, loadAllEvents());
    for (const e of events) {
      const li = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = e.text;
      text.className = "event-chip";

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn--danger";
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", "Remove event");
      removeBtn.textContent = "Delete";
      removeBtn.addEventListener("click", () => {
        removeEvent(iso, e.id);
        render();
      });

      li.appendChild(text);
      li.appendChild(removeBtn);
      eventsList.appendChild(li);
    }

    eventTextInput.value = "";
    eventTextInput.placeholder = `Add an event for ${iso}`;
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
  eventForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = eventTextInput.value.trim();
    if (!text) return;
    const iso = toISODateString(state.selectedDate);
    addEvent(iso, text);
    render();
  });

  function openDayModal(date, anchorEl) {
    if (!dayModal) return;
    dayModal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    renderDayModal(date);
    // Position near the clicked cell (popover-like)
    if (anchorEl && dayModal) {
      const rect = anchorEl.getBoundingClientRect();
      const content = dayModal.querySelector(".modal__content");
      if (content) {
        const viewportPadding = 8;
        const contentWidth = Math.min(520, window.innerWidth * 0.92);
        let top = rect.top + window.scrollY + rect.height + 8;
        let left = rect.left + window.scrollX + rect.width / 2 - contentWidth / 2;
        left = Math.max(viewportPadding, Math.min(left, window.scrollX + window.innerWidth - contentWidth - viewportPadding));
        content.style.width = contentWidth + "px";
        content.style.margin = "0";
        content.style.position = "absolute";
        content.style.top = `${top}px`;
        content.style.left = `${left}px`;
      }
    }
  }
  function closeDayModal() {
    if (!dayModal) return;
    dayModal.setAttribute("hidden", "");
    document.body.style.overflow = "";
  }
  function renderDayModal(date) {
    const iso = toISODateString(date);
    if (dayModalTitle) dayModalTitle.textContent = `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    if (dayModalDate) dayModalDate.textContent = iso;
    if (dayModalList) {
      dayModalList.innerHTML = "";
      const events = getEventsForDate(iso, loadAllEvents());
      for (const e of events) {
        const li = document.createElement("li");
        const text = document.createElement("span");
        text.textContent = e.text;
        text.className = "event-chip";
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
      addEvent(iso, text);
      render();
      renderDayModal(state.selectedDate);
    });
  }

  render();
})();