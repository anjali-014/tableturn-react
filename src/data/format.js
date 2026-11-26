// Dates and times, always in the building's time zone so the app reads the same everywhere.
const ZONE = 'Asia/Kolkata';

export function formatTime(ms) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hour12: false })
    .format(ms);
}

export function formatDay(ms) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short' })
    .format(ms);
}

export function formatWhen(ms) {
  return `${formatDay(ms)}, ${formatTime(ms)}`;
}
