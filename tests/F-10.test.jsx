import { cleanup, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { FRI_1940, MINUTE, clear, clockAt, jump, join, leave, person, seat, wait } from './given.js';
import { reading, wordsOf } from './look.js';

const book = () => screen.getByRole('dialog', { name: /W\d{3}/ });
const everyParty = () => screen.getByRole('table');

/** Kulkarni (6) joins at 19:40, sits at T19 at 19:54 (14 min), leaves at 20:36 (42 min) and T19 is wiped at 20:42. */
async function kulkarniEvening(api, upTo = 'cleared') {
  await join(api, 'Kulkarni', 6);
  jump(14 * MINUTE);
  if (upTo === 'waiting') return;
  await seat(api, 'W001', 'T19');
  if (upTo === 'seated') return;
  jump(42 * MINUTE);
  await leave(api, 'T19');
  if (upTo === 'left') return;
  jump(6 * MINUTE);
  await clear(api, 'T19');
}

/** Ravi's board with this evening; returns once the board has read the parties. */
async function board(before) {
  clockAt(FRI_1940);
  const app = await openApp('/manager/board', { before });
  if (before) await screen.findByRole('table');
  return { ...app, user: person() };
}

async function openBook(user, partyId = 'W001') {
  await user.click(screen.getByRole('button', { name: `Open ${partyId}'s record` }));
  await within(book()).findByText('The party book · Kulkarni');
  return book();
}

/** Closing the book takes a moment (it folds shut). */
const bookGone = () => waitForElementToBeRemoved(() => screen.queryByRole('dialog', { name: /W\d{3}/ }));

afterEach(() => vi.useRealTimers());

describe('F-10 · The manager\'s board', () => {
  test('/manager/board reads "Kothari\'s · tonight" over "The board", with four count cards and "Every party"', async () => {
    await board();
    expect(screen.getByText("Kothari's · tonight")).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'The board' })).toBeInTheDocument();
    for (const card of ['Parties tonight', 'Seated now', 'Quote accuracy', 'Mean turn']) expect(screen.getByText(card)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Every party' })).toBeInTheDocument();
  });

  test('with nobody on the list the cards read 0, 0, — and —, and "Every party" says "Nobody has joined the list yet"', async () => {
    await board();
    expect(await screen.findByText('Nobody has joined the list yet')).toBeInTheDocument();
    expect(screen.getByText('When Meera adds a party, it appears here with its whole evening.')).toBeInTheDocument();
    expect(screen.getByText(reading('Parties tonight', '0', '0 still waiting'))).toBeInTheDocument();
    expect(screen.getByText(reading('Seated now', '0', 'at a table'))).toBeInTheDocument();
    expect(screen.getByText(reading('Quote accuracy', '—', 'once a party is seated'))).toBeInTheDocument();
    expect(screen.getByText(reading('Mean turn', '—', 'once a table is cleared'))).toBeInTheDocument();
  });

  test('"Quote accuracy" gives the average of waited minus quoted: -26 min sooner, +5 min longer, 0 min exactly', async () => {
    const cases = [
      [14, '-26 min', 'seated sooner than quoted'],
      [45, '+5 min', 'waited longer than quoted'],
      [40, '0 min', 'exactly as quoted'],
    ];
    for (const [waited, figure, note] of cases) {
      await board(async (api) => {
        await join(api, 'Kulkarni', 6);
        jump(waited * MINUTE);
        await seat(api, 'W001', 'T19');
      });
      expect(screen.getByText(reading('Quote accuracy', figure, note))).toBeInTheDocument();
      cleanup();
      vi.useRealTimers();
    }
  });

  test('"Quote accuracy" averages over every seated party', async () => {
    await board(async (api) => {
      await join(api, 'Kulkarni', 6);
      await join(api, 'Shah', 2);
      jump(30 * MINUTE);
      await seat(api, 'W001', 'T19');
      jump(20 * MINUTE);
      await seat(api, 'W002', 'T01');
    });
    // waited 30 and 50 against 40 each: -10 and +10
    expect(screen.getByText(reading('Quote accuracy', '0 min', 'exactly as quoted'))).toBeInTheDocument();
  });

  test('"Mean turn" gives the average minutes the cleared parties had their tables: 42 min over 2 cleared tables, or over 1 cleared table', async () => {
    await board(async (api) => {
      await kulkarniEvening(api);
    });
    expect(screen.getByText(reading('Mean turn', '42 min', 'over 1 cleared table'))).toBeInTheDocument();
    cleanup();
    vi.useRealTimers();
    await board(async (api) => {
      await join(api, 'Kulkarni', 6);
      await join(api, 'Shah', 2);
      await seat(api, 'W001', 'T19');
      await seat(api, 'W002', 'T01');
      jump(40 * MINUTE);
      await leave(api, 'T19');
      jump(4 * MINUTE);
      await leave(api, 'T01');
      await clear(api, 'T19');
      await clear(api, 'T01');
    });
    expect(screen.getByText(reading('Mean turn', '42 min', 'over 2 cleared tables'))).toBeInTheDocument();
  });

  test('"Every party" lists the evening newest first, with "—" where a party has not been seated yet', async () => {
    await board(async (api) => {
      await kulkarniEvening(api, 'seated');
      await join(api, 'Shah', 2);
    });
    const table = everyParty();
    expect(within(table).getAllByRole('columnheader').map(wordsOf).filter(Boolean))
      .toEqual(['Party', 'Name', 'Covers', 'Joined', 'Quoted', 'Waited', 'Table', 'Now']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getAllByRole('cell').map(wordsOf).slice(0, 8)).toEqual(['W002', 'Shah', '2', '19:54', '40 min', '—', '—', 'waiting']);
    expect(within(rows[1]).getAllByRole('cell').map(wordsOf).slice(0, 8)).toEqual(['W001', 'Kulkarni', '6', '19:40', '40 min', '14 min', 'T19', 'seated']);
    expect(screen.getByText(reading('Parties tonight', '2', '1 still waiting'))).toBeInTheDocument();
    expect(screen.getByText(reading('Seated now', '1', 'at a table'))).toBeInTheDocument();
  });

  test('"Now" reads left or cleared as the evening goes on', async () => {
    await board(async (api) => {
      await kulkarniEvening(api, 'left');
      await join(api, 'Shah', 2);
      await seat(api, 'W002', 'T01');
      await leave(api, 'T01');
      await clear(api, 'T01');
    });
    const rows = within(everyParty()).getAllByRole('row').slice(1);
    expect(within(rows[0]).getAllByRole('cell')[7]).toHaveTextContent(/^cleared$/);
    expect(within(rows[1]).getAllByRole('cell')[7]).toHaveTextContent(/^left$/);
  });

  test('clicking W001\'s row opens its party book over the board, and the address does not change', async () => {
    const { user, address } = await board((api) => kulkarniEvening(api, 'waiting'));
    await user.click(within(everyParty()).getByText('Kulkarni'));
    expect(await within(book()).findByText('The party book · Kulkarni')).toBeInTheDocument();
    expect(address()).toBe('/manager/board');
    expect(screen.getByRole('heading', { level: 1, name: 'The board' })).toBeInTheDocument();
  });

  test('the row\'s arrow, "Open W001\'s record", opens the book too', async () => {
    const { user, address } = await board((api) => kulkarniEvening(api, 'waiting'));
    await openBook(user);
    expect(address()).toBe('/manager/board');
  });

  test('the book\'s top reads "Kothari\'s · Baner", "The party book", "The party book · Kulkarni" over "W001", with a stamp', async () => {
    const stamps = [['waiting', 'Waiting'], ['seated', 'Seated'], ['left', 'Left'], ['cleared', 'Cleared']];
    for (const [upTo, stamp] of stamps) {
      const { user } = await board((api) => kulkarniEvening(api, upTo));
      const b = await openBook(user);
      expect(within(b).getByText("Kothari's · Baner")).toBeInTheDocument();
      expect(within(b).getByText('The party book')).toBeInTheDocument();
      expect(within(b).getByText('The party book · Kulkarni')).toBeInTheDocument();
      expect(within(b).getByRole('heading', { name: 'W001' })).toBeInTheDocument();
      expect(within(b).getByText(stamp)).toBeInTheDocument();
      cleanup();
      vi.useRealTimers();
    }
  });

  test('a cleared party\'s facts read Party, Joined, Quoted, Waited and Turn', async () => {
    const { user } = await board((api) => kulkarniEvening(api));
    const b = await openBook(user);
    expect(within(b).getByText(reading('Party', 'Kulkarni', '6 covers · place 1'))).toBeInTheDocument();
    expect(within(b).getByText(reading('Joined', 'Fri 6 Nov', 'at 19:40'))).toBeInTheDocument();
    expect(within(b).getByText(reading('Quoted', '40 min', 'at 19:40'))).toBeInTheDocument();
    expect(within(b).getByText(reading('Waited', '14 min', 'table T19'))).toBeInTheDocument();
    expect(within(b).getByText(reading('Turn', '42 min', 'seated to left'))).toBeInTheDocument();
  });

  test('before seating, "Waited" reads "—" with "not seated yet", and there is no Turn', async () => {
    const { user } = await board((api) => kulkarniEvening(api, 'waiting'));
    const b = await openBook(user);
    expect(within(b).getByText(reading('Waited', '—', 'not seated yet'))).toBeInTheDocument();
    expect(within(b).queryByText('Turn')).not.toBeInTheDocument();
  });

  test('"What happened", beside "Can’t be wiped", has one line per thing that happened, oldest first, each with its day and time', async () => {
    const { user } = await board((api) => kulkarniEvening(api));
    const b = await openBook(user);
    expect(within(b).getByText(reading('What happened', 'Can’t be wiped'))).toBeInTheDocument();
    const lines = [
      ['Joined the list, 6 covers', 'Fri 6 Nov, 19:40'],
      ['Quoted a 40-minute wait', 'Fri 6 Nov, 19:40'],
      ['Seated at T19', 'Fri 6 Nov, 19:54', '· waited 14 min'],
      ['Left the table', 'Fri 6 Nov, 20:36'],
      ['Table cleared', 'Fri 6 Nov, 20:42', '· turn 42 min'],
    ];
    expect(within(b).getAllByRole('listitem').map(wordsOf)).toEqual(lines.map((parts) => parts.join(' ')));
  });

  test('a refused seating leaves no line in the book', async () => {
    const { user } = await board(async (api) => {
      await join(api, 'Kulkarni', 6);
      const refused = await api.post('/seatings', { partyId: 'W001', table: 'T01' });
      expect(refused.status).toBeGreaterThanOrEqual(400);
    });
    const b = await openBook(user);
    const lines = [
      ['Joined the list, 6 covers', 'Fri 6 Nov, 19:40'],
      ['Quoted a 40-minute wait', 'Fri 6 Nov, 19:40'],
    ];
    expect(within(b).getAllByRole('listitem').map(wordsOf)).toEqual(lines.map((parts) => parts.join(' ')));
  });

  test('the note at the foot, "How this book works", says lines are only ever added and ends "Close it with ×, Esc or a click outside and you are right where you were."', async () => {
    const { user } = await board((api) => kulkarniEvening(api, 'waiting'));
    const b = await openBook(user);
    expect(within(b).getByText('How this book works')).toBeInTheDocument();
    expect(within(b).getByText(/Lines are only ever added/i)).toBeInTheDocument();
    expect(within(b).getByText(/Close it with ×, Esc or a click outside and you are right where you were\.$/)).toBeInTheDocument();
  });

  test('× (named "Close the notebook") closes the book, the page is as it was, and the focus is back on the arrow', async () => {
    const { user, address } = await board((api) => kulkarniEvening(api, 'waiting'));
    const b = await openBook(user);
    expect(within(b).getByRole('button', { name: 'Close the notebook' })).toHaveFocus();
    await user.click(within(b).getByRole('button', { name: 'Close the notebook' }));
    await bookGone();
    expect(address()).toBe('/manager/board');
    // the focus is handed back as the book finishes closing
    await waitFor(() => expect(screen.getByRole('button', { name: "Open W001's record" })).toHaveFocus());
  });

  test('Esc closes the book, and the focus is back where it was', async () => {
    const { user } = await board((api) => kulkarniEvening(api, 'waiting'));
    await openBook(user);
    await user.keyboard('{Escape}');
    await bookGone();
    await waitFor(() => expect(screen.getByRole('button', { name: "Open W001's record" })).toHaveFocus());
    expect(screen.getByRole('heading', { level: 1, name: 'The board' })).toBeInTheDocument();
  });

  test('on the Waitlist page a row of "On the list now", or its arrow with Enter, opens that party\'s book', async () => {
    clockAt(FRI_1940);
    await openApp('/host/waitlist', { before: (api) => kulkarniEvening(api, 'waiting') });
    const user = person();
    const onTheList = await screen.findByRole('region', { name: /^On the list now/ });
    await user.click(await within(onTheList).findByText('Kulkarni'));
    expect(await within(book()).findByText('The party book · Kulkarni')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await bookGone();
    const arrow = within(onTheList).getByRole('button', { name: "Open W001's record" });
    for (let i = 0; i < 40 && document.activeElement !== arrow; i += 1) await user.tab();
    expect(arrow).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(await within(book()).findByText('The party book · Kulkarni')).toBeInTheDocument();
  });

  test('on the Waitlist page a row of "Seated tonight" opens that party\'s book', async () => {
    clockAt(FRI_1940);
    await openApp('/host/waitlist', { before: (api) => kulkarniEvening(api, 'seated') });
    const user = person();
    const seated = await screen.findByRole('region', { name: /^Seated tonight/ });
    await user.click(within(seated).getByText('Kulkarni'));
    expect(await within(book()).findByText('The party book · Kulkarni')).toBeInTheDocument();
    expect(within(book()).getByText('Seated')).toBeInTheDocument();
  });

  test('in Meera\'s drawer of a seated table, "Open W001\'s record" closes the drawer and opens the book', async () => {
    clockAt(FRI_1940);
    await openApp('/host/floor', { before: (api) => kulkarniEvening(api, 'seated') });
    const user = person();
    await user.click(await screen.findByRole('button', { name: /^Table T19,/ }));
    const drawer = screen.getByRole('dialog', { name: /T19/ });
    await user.click(await within(drawer).findByRole('button', { name: "Open W001's record" }));
    expect(screen.queryByRole('dialog', { name: /T19/ })).not.toBeInTheDocument();
    expect(await within(book()).findByText('The party book · Kulkarni')).toBeInTheDocument();
  });

  test('in Joseph\'s drawer, after he clears the table, "Open W001\'s record" still opens the party\'s book', async () => {
    clockAt(FRI_1940);
    await openApp('/staff', { before: (api) => kulkarniEvening(api, 'left') });
    const user = person();
    await user.click(await screen.findByRole('button', { name: /^Table T19,/ }));
    const drawer = screen.getByRole('dialog', { name: /T19/ });
    await user.click(await within(drawer).findByRole('button', { name: 'Clear' }));
    await within(drawer).findByText(/^T19 is free\./);
    await user.click(within(drawer).getByRole('button', { name: "Open W001's record" }));
    expect(screen.queryByRole('dialog', { name: /T19/ })).not.toBeInTheDocument();
    expect(await within(book()).findByText('The party book · Kulkarni')).toBeInTheDocument();
    expect(within(book()).getByText('Cleared')).toBeInTheDocument();
  });

  test('when the hand-over has finished, "Open W001’s record" in its closing line opens the book over the Waitlist page', async () => {
    clockAt(FRI_1940);
    const { address } = await openApp('/host/waitlist');
    const user = person();
    await user.type(screen.getByRole('textbox', { name: /Name/ }), 'Kulkarni');
    await user.click(screen.getByRole('button', { name: 'Add to the list' }));
    await user.click(await screen.findByRole('button', { name: /W001.*Kulkarni party/ }));
    await wait(1500);
    await user.click(await screen.findByRole('button', { name: 'Open W001’s record' }));
    expect(await within(book()).findByText('The party book · Kulkarni')).toBeInTheDocument();
    expect(address()).toBe('/host/waitlist');
  });

  test('before the parties are read the cards show 0 and — and the table area stays empty', async () => {
    await openApp('/manager/board', { before: (api) => join(api, 'Kulkarni', 6) });
    expect(screen.getByText(reading('Parties tonight', '0'))).toBeInTheDocument();
    expect(screen.getByText(reading('Quote accuracy', '—'))).toBeInTheDocument();
    expect(screen.getByText(reading('Mean turn', '—'))).toBeInTheDocument();
    expect(screen.queryByText('Nobody has joined the list yet')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByText(reading('Parties tonight', '1'))).toBeInTheDocument();
  });
});
