// Puts the restaurant into a state before a screen opens, and sets the clock, the way the ticket's "Given" says.
// Everything goes through the api the screens use; nothing here looks inside the app.
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;

/** Friday 6 November 2026, 19:40 at Kothari's (India time): a party that joins now is quoted about 40 minutes. */
export const FRI_1940 = new Date('2026-11-06T19:40:00+05:30');

/** Puts the clock at this moment; it keeps running on from there. */
export function clockAt(when) {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(when);
}

/**
 * Lets this much time pass on the clock, timers included, in small steps: between steps the screen gets to draw,
 * so a timer that a new screen starts also runs within the time.
 */
export async function wait(ms) {
  for (let left = ms; left > 0; left -= 100) await vi.advanceTimersByTimeAsync(Math.min(100, left));
}

/** Twenty seconds pass, and a moment more for what the screens read again then to arrive and be drawn. */
export async function twentySecondsPass() {
  await wait(21_000);
}

/** Moves only the time of day on (as when the screen is opened later), firing nothing. */
export function jump(ms) {
  vi.setSystemTime(new Date(Date.now() + ms));
}

/** A person at the keyboard and mouse; works with the clock set or not. */
export function person() {
  return userEvent.setup({ advanceTimers: (ms) => (vi.isFakeTimers() ? vi.advanceTimersByTime(ms) : undefined) });
}

/** A party joins the list at the stand, through the api: { partyId, name, covers, position, quotedMinutes, ... }. */
export async function join(api, name, covers, phone) {
  const { status, body } = await api.post('/waitlist', phone === undefined ? { name, covers } : { name, covers, phone });
  if (status !== 201) throw new Error(`the party was refused: ${JSON.stringify(body)}`);
  return body;
}

/** A party is seated at a table, through the api: { seatingId, partyId, table, waitedMinutes, ... }. */
export async function seat(api, partyId, table) {
  const { status, body } = await api.post('/seatings', { partyId, table });
  if (status !== 201) throw new Error(`the seating was refused: ${JSON.stringify(body)}`);
  return body;
}

/** The seating now at a table (null when the table is free). */
async function seatingAt(api, table) {
  const { body } = await api.get(`/branches/Baner/tables/${table}/seating`);
  return body.seatingId;
}

/** The party at this table gets up. */
export async function leave(api, table) {
  const { status, body } = await api.post(`/seatings/${await seatingAt(api, table)}/leave`);
  if (status !== 200) throw new Error(`the leave was refused: ${JSON.stringify(body)}`);
  return body;
}

/** The table, whose party has left, is wiped. */
export async function clear(api, table) {
  const { status, body } = await api.post(`/seatings/${await seatingAt(api, table)}/clear`);
  if (status !== 200) throw new Error(`the clear was refused: ${JSON.stringify(body)}`);
  return body;
}

/** The table numbers from one to another: tablesFrom('T01', 'T04') is T01, T02, T03, T04. */
export function tablesFrom(first, last) {
  const a = Number(first.slice(1));
  const b = Number(last.slice(1));
  return Array.from({ length: b - a + 1 }, (_, i) => `T${String(a + i).padStart(2, '0')}`);
}
