import { BRANCH, SECTIONS, STATES } from './restaurant.js';

// Each refusal the screens can meet, in the words of the person who meets it. The backend gives one shape (type,
// title, status, detail, and some extras); the screens never show its own wording. Each sentence here is built from
// the refusal's type, the fields it names, its extras, and `facts`: what the screen asked about (the table, the
// party, or what was typed in the form).

/** "Window, Garden or Indoor" */
const orList = (names) =>
  `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;

/** What to fix in one field, from the field's name and the value the screen sent for it. */
function fieldText(field, facts) {
  const value = facts[field];
  switch (field) {
    case 'name':
      if (typeof value !== 'string' || value.trim() === '') return 'Type the party’s name first.';
      return 'Keep the name to 60 letters or fewer.';

    case 'covers':
      if (typeof value === 'number' && value > 20) return 'That is too many for one party. The largest table seats six.';
      if (typeof value === 'number' && value >= 1 && !Number.isInteger(value)) return 'Type a whole number of people.';
      return 'Type how many people: at least one.';

    case 'phone': return 'Type the phone with its country code, like +919876543210.';

    case 'section':
      return `Pick a section: ${orList(SECTIONS)}.`;

    case 'state':
      return `Pick a state: ${orList(STATES.map((s) => s.name))}.`;

    case 'partyId': return 'Pick a party to seat.';
    case 'table': return 'Pick a table first.';

    default:
      return 'Check what you typed and try again.';
  }
}

/** The fields a refusal names, each with what to fix in it: { name: 'Type the party’s name first.' }. */
export function fieldWords(answer, facts) {
  const fields = (answer?.body?.errors ?? []).map(
    (error) => error.field
  );

  return Object.fromEntries(
    fields.map((field) => [field, fieldText(field, facts ?? {})])
  );
}

export function explain(answer, known) {
  const body = answer?.body ?? {};
  const facts = known ?? {};

  switch (body.type) {
    case '/errors/validation': {
      const text = [
        ...new Set(Object.values(fieldWords(answer, facts))),
      ].join(' ');

      return {
        title: 'Something in the form is not right',
        text: text || 'Check what you typed and try again.',
      };
    }

    case '/errors/party-too-big':
      return { title: 'No table here seats that many', text: `The largest table seats ${body.maxCovers}. Suggest splitting the party.` };

    case '/errors/table-too-small':
      return { title: 'That table is too small', text: `Table ${facts.table} seats ${facts.seats}; the party has ${facts.covers}. Pick a table with more seats.` };

    case '/errors/already-seated':
      return { title: 'That party is already at a table', text: `Party ${facts.partyId} is already at a table.` };

    case '/errors/table-not-cleared':
      return { title: 'That table is not ready', text: `Table ${facts.table} has not been cleared since its last party. It needs clearing first.` };

    case '/errors/overtaking':
      return body.mustSeatFirst
        ? { title: 'A larger party must be seated first', text: `A smaller party cannot take a larger table here: party ${body.mustSeatFirst} is waiting and fits table ${facts.table}.` }
        : { title: 'Not at a larger table', text: `A smaller party cannot take a larger table here: table ${facts.table} is kept for its size. Under this setting a smaller party never takes a larger table.` };

    case '/errors/no-such-party':
      return { title: 'No such party', text: `Party ${facts.partyId} is not on the list of this branch.` };

    case '/errors/no-such-table':
      return {
        title: 'No such table',
        text: `Branch ${BRANCH.code} has no table ${facts.table}. Tables run from T01 to T22.`,
      };

    case '/errors/no-such-branch':
      return {
        title: 'That branch is not here',
        text: `This floor is ${BRANCH.code} only.`,
      };

    default:
      return {
        title: 'That did not work',
        text: 'Nothing changed. Try again.',
      };
  }
}
