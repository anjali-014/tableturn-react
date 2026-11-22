// PROVIDED: do not edit.
// A party is seated at a table, gets up (leave), and the table is wiped for the next party (clear).
import { iso, now, wholeSecond } from '../clock.js';
import {
  alreadyCleared, alreadyLeft, alreadySeated, noSuchParty, noSuchSeating, noSuchTable, notLeftYet, overtaking,
  tableNotCleared, tableTooSmall,
} from '../errors.js';
import { waitedMinutes } from '../parties/service.js';
import { SETTINGS } from '../seed.js';
import { events, parties, seatings, tables } from '../store.js';

const BRANCH = 'Baner';

/** The order of checks for a seating; the first failure wins, so each refusal can be reached on its own. */
function checkCanSeat({ party, table, partyId, no }) {
  if (!party) throw noSuchParty(partyId);
  if (!table) throw noSuchTable(BRANCH, no);
  if (party.state !== 'waiting') throw alreadySeated(partyId);
  if (table.currentSeatingId !== null) throw tableNotCleared(no);
  if (table.seats < party.covers) throw tableTooSmall(no, table.seats, party.covers);
}

/**
 * The upgrade rule, checked once the table fits: a party may take a table with more seats than covers only as the
 * setting allows. Under `when_nobody_larger_waits`, a waiting party with more covers that the table could seat goes
 * first (the one that joined first is named).
 */
function checkUpgrade(party, table) {
  if (table.seats === party.covers || SETTINGS.smallPartyUpgrade === 'always') return;
  if (SETTINGS.smallPartyUpgrade === 'never') throw overtaking(table.no, null);
  const [first] = parties
    .filter((p) => p.branchId === BRANCH && p.state === 'waiting' && p.covers > party.covers && p.covers <= table.seats)
    .sort((a, b) => a.joinedAt - b.joinedAt || a.partyId.localeCompare(b.partyId));
  if (first) throw overtaking(table.no, first.partyId);
}

/** The seating, or a 404 refusal. */
function requireSeating(seatingId) {
  const seating = seatings.find((s) => s.branchId === BRANCH && s.seatingId === seatingId);
  if (!seating) throw noSuchSeating(seatingId);
  return seating;
}

/**
 * Seats a party at a table, after the checks: the party exists, the table exists, the party is not already seated,
 * the table is cleared, the table fits the party, and the upgrade rule. The seating, the table, the party's real
 * wait and the seated event are written together.
 */
export function seat({ partyId, table: no }) {
  const party = parties.find((p) => p.branchId === BRANCH && p.partyId === partyId);
  const table = tables.find((t) => t.branchId === BRANCH && t.no === no);
  checkCanSeat({ party, table, partyId, no });
  checkUpgrade(party, table);
  const seatedAt = wholeSecond(now());
  const waited = waitedMinutes(party.joinedAt, seatedAt);
  const seatingId = `S${String(seatings.filter((s) => s.branchId === BRANCH).length + 1).padStart(3, '0')}`;
  seatings.push({ branchId: BRANCH, seatingId, partyId, tableId: no, seatedAt, leftAt: null, clearedAt: null, turnMinutes: null });
  table.currentSeatingId = seatingId;
  Object.assign(party, { state: 'seated', waitedMinutes: waited });
  events.push({ branchId: BRANCH, partyId, seatingId, kind: 'seated', at: seatedAt, data: { table: no, waitedMinutes: waited } });
  return { seatingId, partyId, table: no, seatedAt: iso(seatedAt), waitedMinutes: waited };
}

/** The party gets up: the table is now uncleared. A second leave is refused, never a second stamp. */
export function leave(seatingId) {
  const seating = requireSeating(seatingId);
  if (seating.leftAt !== null) throw alreadyLeft(seatingId);
  const leftAt = wholeSecond(now());
  seating.leftAt = leftAt;
  parties.find((p) => p.branchId === BRANCH && p.partyId === seating.partyId).state = 'left';
  events.push({ branchId: BRANCH, partyId: seating.partyId, seatingId, kind: 'left', at: leftAt, data: {} });
  return { seatingId, leftAt: iso(leftAt) };
}

/**
 * The table is wiped. The seating gets its turn (seated to left: what the table earned, not how long the wiping
 * took), the table is free and the party cleared, all together, so the floor never shows a free table with an open
 * seating.
 */
export function clear(seatingId) {
  const seating = requireSeating(seatingId);
  if (seating.clearedAt !== null) throw alreadyCleared(seatingId);
  if (seating.leftAt === null) throw notLeftYet(seatingId);
  const clearedAt = wholeSecond(now());
  const turnMinutes = Math.floor((seating.leftAt.getTime() - seating.seatedAt.getTime()) / 60000);
  Object.assign(seating, { clearedAt, turnMinutes });
  Object.assign(tables.find((t) => t.branchId === BRANCH && t.no === seating.tableId), { currentSeatingId: null, clearedAt });
  parties.find((p) => p.branchId === BRANCH && p.partyId === seating.partyId).state = 'cleared';
  events.push({ branchId: BRANCH, partyId: seating.partyId, seatingId, kind: 'cleared', at: clearedAt, data: { turnMinutes } });
  return { seatingId, table: seating.tableId, turnMinutes, clearedAt: iso(clearedAt) };
}
