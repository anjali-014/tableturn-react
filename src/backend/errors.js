// PROVIDED: do not edit.
// Every refusal the backend gives, with the MERN backend's status, type, title and detail, and the extra fields
// some of them carry (errors, maxCovers, mustSeatFirst). routes.js turns a thrown Refusal into the problem body.

export class Refusal extends Error {
  constructor(status, type, title, detail, extras = {}) {
    super(detail);
    this.status = status;
    this.type = type;
    this.title = title;
    this.extras = extras;
  }
}

/** @param errors [{ field, message }] */
export const validationError = (errors) => new Refusal(400, '/errors/validation', 'Invalid request', 'The request is not valid', { errors });

export const noSuchBranch = (branch) => new Refusal(404, '/errors/no-such-branch', 'No such branch', `There is no branch ${branch}`);

export const noSuchTable = (branch, no) => new Refusal(404, '/errors/no-such-table', 'No such table', `Branch ${branch} has no table ${no}`);

export const partyTooBig = (covers, maxCovers) => new Refusal(400, '/errors/party-too-big', 'Party too big',
  `No table here seats ${covers}; the largest seats ${maxCovers}`, { maxCovers });

export const noSuchParty = (partyId) => new Refusal(404, '/errors/no-such-party', 'No such party', `Party ${partyId} is not on the list of this branch`);

export const tableTooSmall = (no, seats, covers) => new Refusal(409, '/errors/table-too-small', 'Table too small',
  `Table ${no} seats ${seats}; the party has ${covers}`);

export const alreadySeated = (partyId) => new Refusal(409, '/errors/already-seated', 'Already seated', `Party ${partyId} is already at a table`);

export const tableNotCleared = (no) => new Refusal(409, '/errors/table-not-cleared', 'Table not cleared',
  `Table ${no} has not been cleared since its last party`);

export const noSuchSeating = (seatingId) => new Refusal(404, '/errors/no-such-seating', 'No such seating', `There is no seating ${seatingId}`);

export const alreadyLeft = (seatingId) => new Refusal(409, '/errors/already-left', 'Already left', `The party of seating ${seatingId} has already left`);

export const notLeftYet = (seatingId) => new Refusal(409, '/errors/not-left-yet', 'Not left yet',
  `The party of seating ${seatingId} has not left: clear comes after leave`);

export const alreadyCleared = (seatingId) => new Refusal(409, '/errors/already-cleared', 'Already cleared', `Seating ${seatingId} has already been cleared`);

/** @param mustSeatFirst the waiting party that goes first, or null when the setting never upgrades */
export function overtaking(table, mustSeatFirst) {
  const why = mustSeatFirst ? `party ${mustSeatFirst} is waiting and fits table ${table}` : `table ${table} is kept for its size`;
  return new Refusal(409, '/errors/overtaking', 'Overtaking', `A smaller party cannot take a larger table here: ${why}`,
    mustSeatFirst ? { mustSeatFirst } : {});
}
