// Times, always in the building's time zone so the app reads the same everywhere.
const ZONE = 'Asia/Kolkata';

export function formatTime(ms) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hour12: false })
    .format(ms);
}
