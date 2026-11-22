// PROVIDED: do not edit.
// A party joins the list: a number, a place in the queue and a quoted wait.
import { iso, now, wholeSecond } from '../clock.js';
import { partyTooBig } from '../errors.js';
import { SETTINGS } from '../seed.js';
import { events, parties, tables } from '../store.js';

const BRANCH = 'Baner';

/** The most covers any table of the branch seats. */
const largestSeats = (branchId) => Math.max(0, ...tables.filter((t) => t.branchId === branchId).map((t) => t.seats));

/** The next party id in the branch: 'W' and a number of at least three digits, W001 first. */
const nextId = (branchId) => `W${String(parties.filter((p) => p.branchId === branchId).length + 1).padStart(3, '0')}`;

/**
 * A party joins the list: refused if no table here could ever seat it. Its position is counted at insert, and the
 * wait it is quoted (the setting) is stored with the clock's time. The party and its joined and quoted events are
 * written together, after every check, so a refusal changes nothing.
 */
export function join({ name, covers, phone }) {
  const maxCovers = largestSeats(BRANCH);
  if (covers > maxCovers) throw partyTooBig(covers, maxCovers);
  const joinedAt = wholeSecond(now());
  const waiting = parties.filter((p) => p.branchId === BRANCH && p.state === 'waiting').length;
  const party = {
    branchId: BRANCH, partyId: nextId(BRANCH), name, covers, phone: phone || null, state: 'waiting', joinedAt,
    position: waiting + 1, quotedMinutes: SETTINGS.defaultQuoteMinutes, quotedAt: joinedAt, waitedMinutes: null,
  };
  parties.push(party);
  // never the phone number in an event
  events.push(
    { branchId: BRANCH, partyId: party.partyId, seatingId: null, kind: 'joined', at: joinedAt, data: { covers } },
    { branchId: BRANCH, partyId: party.partyId, seatingId: null, kind: 'quoted', at: joinedAt, data: { quotedMinutes: party.quotedMinutes } },
  );
  return {
    partyId: party.partyId, name, covers, position: party.position, joinedAt: iso(joinedAt),
    quotedMinutes: party.quotedMinutes, quotedAt: iso(joinedAt),
  };
}
