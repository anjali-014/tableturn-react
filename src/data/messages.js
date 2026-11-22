import { BRANCH, SECTIONS, STATES } from './restaurant.js';

// Join names using commas and "or".
const orList = (names) =>
  `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;

// Explain how to correct an invalid field.
function fieldText(field) {
  switch (field) {
    case 'section':
      return `Pick a section: ${orList(SECTIONS)}.`;

    case 'state':
      return `Pick a state: ${orList(STATES.map((s) => s.name))}.`;

    default:
      return 'Check what you typed and try again.';
  }
}

// Get correction messages for all invalid fields.
function fieldWords(answer) {
  const fields = (answer?.body?.errors ?? []).map(
    (error) => error.field
  );

  return Object.fromEntries(
    fields.map((field) => [field, fieldText(field)])
  );
}

export function explain(answer, known) {
  const body = answer?.body ?? {};
  const facts = known ?? {};

  switch (body.type) {
    case '/errors/validation': {
      const text = [
        ...new Set(Object.values(fieldWords(answer))),
      ].join(' ');

      return {
        title: 'Something in the form is not right',
        text: text || 'Check what you typed and try again.',
      };
    }

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
