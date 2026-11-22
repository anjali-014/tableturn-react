// PROVIDED: do not edit.
// The starting data, the same records the MERN backend seeds at its first start: the Baner branch and its 22 tables
// (seed/tables.csv, in its order), and the settings at their defaults.

export const BRANCH = { code: 'Baner', name: 'Baner' };

export const TABLES = [
  ['T01', 2, 'Window'], ['T02', 2, 'Window'], ['T03', 2, 'Window'], ['T04', 2, 'Window'],
  ['T05', 2, 'Garden'], ['T06', 2, 'Garden'], ['T07', 2, 'Garden'],
  ['T08', 2, 'Indoor'], ['T09', 2, 'Indoor'], ['T10', 2, 'Indoor'],
  ['T11', 4, 'Garden'], ['T12', 4, 'Garden'], ['T13', 4, 'Garden'],
  ['T14', 4, 'Window'], ['T15', 4, 'Window'], ['T16', 4, 'Window'],
  ['T17', 4, 'Indoor'], ['T18', 4, 'Indoor'],
  ['T19', 6, 'Garden'], ['T20', 6, 'Garden'], ['T21', 6, 'Indoor'], ['T22', 6, 'Indoor'],
].map(([no, seats, section]) => ({ no, seats, section }));

/** What the MERN app reads from its environment (DEFAULT_QUOTE_MINUTES, SMALL_PARTY_UPGRADE), at the defaults. */
export const SETTINGS = {
  defaultQuoteMinutes: 40,
  smallPartyUpgrade: 'when_nobody_larger_waits',     // or 'never', 'always'
};
