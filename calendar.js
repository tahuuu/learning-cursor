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
      const cell = document.createElement("div");
      cell.className = "day-cell";
      cell.setAttribute("role", "gridcell");
      cell.tabIndex = 0;

      const isOtherMonth = d.getMonth() !== state.visibleMonthDate.getMonth();
      const isToday = isSameDay(d, today);

      const header = document.createElement("div");
      header.className = "day-cell__header";

      const dateLabel = document.createElement("div");
      dateLabel.className = "day-cell__date" + (isOtherMonth ? " day-cell__other-month" : "") + (isToday ? " day-cell__today" : "");
      dateLabel.textContent = String(d.getDate());

      const eventsPill = document.createElement("div");
      eventsPill.className = "pill";
      const iso = toISODateString(d);
      const count = getEventsForDate(iso, loadAllEvents()).length;
      eventsPill.textContent = count === 1 ? "1 event" : `${count} events`;

      header.appendChild(dateLabel);
      header.appendChild(eventsPill);

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
      cell.appendChild(eventsPreview);

      cell.addEventListener("click", () => {
        state.selectedDate = new Date(d);
        renderSelectedDay();
      });
      cell.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          state.selectedDate = new Date(d);
          renderSelectedDay();
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

  render();
})();