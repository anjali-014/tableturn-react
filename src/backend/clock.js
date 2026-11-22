// PROVIDED: do not edit.
// The one place the backend's time comes from.

/** The time now, as a Date. */
export function now() {
  return new Date(Date.now());
}

/** The same instant without its milliseconds: every time the app stores and answers is to the whole second. */
export function wholeSecond(date) {
  return new Date(Math.floor(date.getTime() / 1000) * 1000);
}

/** An instant as the API writes it: ISO 8601 in UTC, to the whole second, ending in Z. */
export function iso(date) {
  return wholeSecond(date).toISOString().replace('.000Z', 'Z');
}
