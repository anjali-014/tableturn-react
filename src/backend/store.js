// PROVIDED: do not edit.
// The "database" for this session only: one plain array per MERN collection, filled from seed.js when the page
// loads. Nothing is saved anywhere, so a refresh starts a fresh evening: every table free, nobody waiting.
import { BRANCH, TABLES } from './seed.js';

/** { code, name } */
export const branches = [{ ...BRANCH }];

/** { branchId, no, seats, section, currentSeatingId, clearedAt } */
export const tables = TABLES.map((t) => ({ branchId: BRANCH.code, ...t, currentSeatingId: null, clearedAt: null }));

/** { branchId, partyId, name, covers, phone, state, joinedAt, position, quotedMinutes, quotedAt, waitedMinutes } */
export const parties = [];

/** { branchId, seatingId, partyId, tableId, seatedAt, leftAt, clearedAt, turnMinutes } */
export const seatings = [];

/** { branchId, partyId, seatingId, kind, at, data }: only ever added to, never changed or removed */
export const events = [];
