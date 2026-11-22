// PROVIDED: do not edit.
// One party and its whole history. The events are the only history the API gives.
import { iso } from '../clock.js';
import { noSuchParty } from '../errors.js';
import { events, parties, seatings } from '../store.js';

const BRANCH = 'Baner';

/** The real wait, stamped once at seating: whole minutes from joining to being seated, rounded down. */
export function waitedMinutes(joinedAt, seatedAt) {
  return Math.floor((seatedAt.getTime() - joinedAt.getTime()) / 60000);
}

/**
 * A party as the API shows it (never the phone number). Once seated it also shows its real wait and its table (the
 * table of its seating).
 */
function shapeParty(p, seating) {
  const shaped = {
    partyId: p.partyId, name: p.name, covers: p.covers, state: p.state, position: p.position, joinedAt: iso(p.joinedAt),
    quotedMinutes: p.quotedMinutes, quotedAt: iso(p.quotedAt),
  };
  return seating ? { ...shaped, waitedMinutes: p.waitedMinutes, table: seating.tableId } : shaped;
}

/** An event as the API shows it: when, what, and its facts beside them. */
function shapeEvent(e) {
  return { at: iso(e.at), kind: e.kind, ...e.data };
}

/** A party and its whole history, oldest event first (same-time events in the order they were written). */
export function party(partyId) {
  const p = parties.find((x) => x.branchId === BRANCH && x.partyId === partyId);
  if (!p) throw noSuchParty(partyId);
  const history = events
    .map((e, order) => ({ e, order }))
    .filter(({ e }) => e.branchId === BRANCH && e.partyId === partyId)
    .sort((a, b) => a.e.at - b.e.at || a.order - b.order)
    .map(({ e }) => shapeEvent(e));
  // the party's latest seating, or none
  const seating = seatings.filter((s) => s.branchId === BRANCH && s.partyId === partyId).sort((a, b) => b.seatedAt - a.seatedAt)[0];
  return { ...shapeParty(p, seating), events: history };
}

// Not in the MERN API: stands in for the list of tonight's parties that the waitlist, the guest's party picker and
// the manager's board need. The MERN API reads one party at a time (GET /parties/{partyId}) and has no list.
/** Every party of the branch, the newest first: who they are and their state, as each record names them. */
export function listParties() {
  return {
    parties: parties
      .filter((p) => p.branchId === BRANCH)
      .slice()
      .reverse()
      .map((p) => ({ partyId: p.partyId, name: p.name, covers: p.covers, state: p.state })),
  };
}
