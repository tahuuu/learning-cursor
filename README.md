# Simple Calendar (Vanilla JS)

A feature-rich, single-page calendar web application built from the ground up with plain (vanilla) JavaScript, HTML, and CSS. This project demonstrates modern web development techniques without relying on any external frameworks. All event data is stored locally in your browser.

## Features

*   **Multiple Calendar Views:**
    *   **Month View:** A classic grid layout showing all days of the month, with event previews.
    *   **Day View:** A detailed timeline view with 30-minute time blocks.
    *   **Week View:** A 7-day timeline view to see your week at a glance.
    *   **Year View:** A compact view of the entire year.
*   **Full Event Management:**
    *   Create, edit, and delete events.
    *   Set event titles, start times, and end times.
    *   Mark events as "All Day."
    *   Assign colors to events for better organization.
*   **Drag & Drop:**
    *   Intuitively reschedule events by dragging and dropping them to a new time or day in the **Day** and **Week** views.
*   **Recurring Events:**
    *   Set events to repeat daily, weekly, monthly, or yearly.
*   **Holiday Sync:**
    *   Sync and display Indonesian national holidays from an external API, automatically coloring them red.
*   **Event Search:**
    *   A toolbar search bar to quickly find events by title.
*   **Dual Calendar System:**
    *   Displays the **Hijri** date alongside the Gregorian date on each day.
*   **Theming:**
    *   Switch between a clean **Light Mode** and a stylish **Dark Mode**.
*   **Real-time Clock:**
    *   A live clock in the header that displays the current time in WIB.

## Tech Stack

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Data Storage:** Browser `localStorage`
*   **APIs:** `fetch` API for holiday data, `Intl.DateTimeFormat` for Hijri conversion.

## How to Use

1.  **No build step required.** Simply open the `calendar.html` file in any modern web browser.
2.  Start adding events by clicking on a date in the month view or a time slot in the day/week views.
3.  Use the "Sync Holidays" button to populate the calendar with Indonesian national holidays.
4.  All your events are saved automatically in your browser.

---
*This project was created with the assistance of a large language model.*
