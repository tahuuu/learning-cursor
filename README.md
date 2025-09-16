# Simple Calendar (Vanilla JS)

A tiny, client-only calendar web app. It shows a monthly grid, supports previous/next/today navigation, lets you select a day, and add/remove simple text events. Data is saved to your browser's localStorage.

## Features
- Current month view with weekday headers
- Previous / Next / Today navigation
- Click or press Enter/Space on a day to select it
- Add and delete simple text events per day
- Events preview and count on each day
- Responsive layout and accessible controls

## Getting Started
1. Save all four files in the same folder.
2. Open `index.html` in any modern browser.

## Notes
- Events are stored under the `simple_calendar_events_v1` key in localStorage, per ISO date (`YYYY-MM-DD`).
- No external dependencies. Works offline once loaded.
- To reset data, clear localStorage for the site.
