// PROVIDED: do not edit.
// The floor: every table and its state, which is worked out from the table's current seating on every read.
import { now } from '../clock.js';
import { noSuchBranch, noSuchTable } from '../errors.js';
import { branches, seatings, tables } from '../store.js';

/** A table's state is derived from its current seating, on every read; nothing stores it. */
function stateOf(seating) {
  if (!seating) return 'free';
  return seating.leftAt === null ? 'seated' : 'uncleared';
}

/** A free table is exactly { no, seats, section, state }; a table in use adds its party and whole minutes seated. */
function shape(table) {
  const seating = seatings.find((s) => s.seatingId === table.currentSeatingId);
  const shaped = { no: table.no, seats: table.seats, section: table.section, state: stateOf(seating) };
  if (!seating) return shaped;
  const seatedMinutes = Math.floor((now().getTime() - seating.seatedAt.getTime()) / 60000);
  return { ...shaped, partyId: seating.partyId, seatedMinutes };
}

function requireBranch(branch) {
  if (!branches.some((b) => b.code === branch)) throw noSuchBranch(branch);
}

function requireTable(branch, no) {
  requireBranch(branch);
  const found = tables.find((t) => t.branchId === branch && t.no === no);
  if (!found) throw noSuchTable(branch, no);
  return found;
}

/** The floor, optionally one section and/or one state; `free` counts the free tables among those shown. */
export function floor(branch, { section, state } = {}) {
  requireBranch(branch);
  const shown = tables
    .filter((t) => t.branchId === branch)
    .sort((a, b) => a.no.localeCompare(b.no))
    .map(shape)
    .filter((t) => (!section || t.section === section) && (!state || t.state === state));
  return { branch, free: shown.filter((t) => t.state === 'free').length, tables: shown };
}

export function table(branch, no) {
  return shape(requireTable(branch, no));
}

// Not in the MERN API: stands in for the seating id the floor staff need for Leave and Clear. The MERN table
// answer names the party at a table but not its seating, so this gives the table's current seating (null when free).
export function currentSeating(branch, no) {
  const found = requireTable(branch, no);
  return { no: found.no, seatingId: found.currentSeatingId };
}
