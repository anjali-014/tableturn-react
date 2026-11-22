import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { FRI_1940, MINUTE, clear, clockAt, jump, join, leave, person, seat, twentySecondsPass } from './given.js';
import { reading, wordsOf } from './look.js';

const tableButtons = (where = screen) => where.queryAllByRole('button', { name: /^Table T\d\d,/ });
const tableButton = (no) => screen.getByRole('button', { name: new RegExp(`^Table ${no},`) });
/** The seats of each table button in `where`, in the order they stand: [2, 2, 4, ...]. */
function seatsInOrder(where) {
  const by = (n) => where.queryAllByRole('button', { name: new RegExp(`^Table T\\d\\d, ${n} seats,`) });
  const [twos, fours, sixes] = [by(2), by(4), by(6)];
  return tableButtons(where).map((b) => (twos.includes(b) ? 2 : fours.includes(b) ? 4 : sixes.includes(b) ? 6 : 0));
}

afterEach(() => vi.useRealTimers());

describe('F-03 · The floor', () => {
  test('the floor reads "Kothari\'s · Baner" over the title "The floor"', async () => {
    await openApp('/host/floor');
    expect(screen.getByRole('heading', { level: 1, name: 'The floor' })).toBeInTheDocument();
    // once in the header's TableTurn mark, once over the page title
    expect(screen.getAllByText("Kothari's · Baner")).toHaveLength(2);
  });

  test('on a fresh evening the count cards read 22 tables, 22 free, 0 seated and — for the longest sitting', async () => {
    await openApp('/host/floor');
    expect(await screen.findByText(reading('Total tables', '22', '10 twos · 8 fours · 4 sixes'))).toBeInTheDocument();
    expect(screen.getByText(reading('Free tables', '22', 'ready for a party'))).toBeInTheDocument();
    expect(screen.getByText(reading('Seated', '0', 'nobody seated yet'))).toBeInTheDocument();
    expect(screen.getByText(reading('Longest sitting', '—', 'since seated'))).toBeInTheDocument();
  });

  test('with two parties seated 12 and 30 minutes ago the cards read 20 free, 2 seated and 30 min longest sitting', async () => {
    clockAt(new Date(FRI_1940.getTime() - 30 * MINUTE));
    await openApp('/host/floor', {
      before: async (api) => {
        await join(api, 'Kulkarni', 2);
        await seat(api, 'W001', 'T01');
        jump(18 * MINUTE);
        await join(api, 'Shah', 2);
        await seat(api, 'W002', 'T02');
        jump(12 * MINUTE);
      },
    });
    expect(await screen.findByText(reading('Free tables', '20', 'ready for a party'))).toBeInTheDocument();
    expect(screen.getByText(reading('Seated', '2', 'parties eating'))).toBeInTheDocument();
    expect(screen.getByText(reading('Longest sitting', '30 min', 'since seated'))).toBeInTheDocument();
    expect(screen.getByText(reading('Total tables', '22'))).toBeInTheDocument();
  });

  test('Window, Garden and Indoor come in that order with their free counts, each laid out twos, then fours, then sixes', async () => {
    await openApp('/host/floor');
    await screen.findByRole('button', { name: /^Table T01,/ });
    const sections = screen.getAllByRole('region', { name: /Window|Garden|Indoor/ });
    expect(sections).toHaveLength(3);
    const expected = [
      ['Window', '7/7 free', ['T01', 'T02', 'T03', 'T04', 'T14', 'T15', 'T16']],
      ['Garden', '8/8 free', ['T05', 'T06', 'T07', 'T11', 'T12', 'T13', 'T19', 'T20']],
      ['Indoor', '7/7 free', ['T08', 'T09', 'T10', 'T17', 'T18', 'T21', 'T22']],
    ];
    expected.forEach(([name, free, tables], i) => {
      const section = sections[i];
      expect(within(section).getByText(name)).toBeInTheDocument();
      expect(within(section).getByText(reading(free))).toBeInTheDocument();
      expect(tableButtons(within(section))).toHaveLength(tables.length);
      for (const no of tables) expect(within(section).getByRole('button', { name: new RegExp(`^Table ${no},`) })).toBeInTheDocument();
      const seats = seatsInOrder(within(section));
      expect(seats).not.toContain(0);
      expect([...seats].sort((a, b) => a - b)).toEqual(seats);
    });
    expect(seatsInOrder(within(sections[0]))).not.toContain(6);
  });

  test('a free table shows its number tag and "2 seats", "4 seats" or "6 seats"', async () => {
    await openApp('/host/floor');
    for (const [no, seats] of [['T01', '2 seats'], ['T11', '4 seats'], ['T19', '6 seats']]) {
      const table = await screen.findByRole('button', { name: new RegExp(`^Table ${no},`) });
      expect(within(table).getByText(no)).toBeInTheDocument();
      expect(within(table).getByText(seats)).toBeInTheDocument();
    }
  });

  test('a table with a party at it shows the party\'s number W001 and the minutes since they sat, 12 min', async () => {
    clockAt(new Date(FRI_1940.getTime() - 12 * MINUTE));
    await openApp('/host/floor', {
      before: async (api) => {
        await join(api, 'Kulkarni', 6);
        await seat(api, 'W001', 'T19');
        jump(12 * MINUTE);
      },
    });
    const table = await screen.findByRole('button', { name: /^Table T19,/ });
    expect(await within(table).findByText('W001')).toBeInTheDocument();
    expect(within(table).getByText('12 min')).toBeInTheDocument();
    expect(within(table).queryByText('6 seats')).not.toBeInTheDocument();
  });

  test('a table whose party has left and nobody has wiped reads "to clear"', async () => {
    await openApp('/host/floor', {
      before: async (api) => {
        await join(api, 'Kulkarni', 6);
        await seat(api, 'W001', 'T19');
        await leave(api, 'T19');
      },
    });
    const table = await screen.findByRole('button', { name: /^Table T19,/ });
    expect(await within(table).findByText('to clear')).toBeInTheDocument();
    expect(within(table).queryByText('6 seats')).not.toBeInTheDocument();
  });

  test('under the tables the legend reads "Free", "Seated" and "Left, to be cleared"', async () => {
    await openApp('/host/floor');
    const legend = screen.getAllByRole('list').find((list) => within(list).queryByText('Left, to be cleared'));
    expect(legend).toBeTruthy();
    expect(within(legend).getAllByRole('listitem').map(wordsOf)).toEqual(['Free', 'Seated', 'Left, to be cleared']);
  });

  test('when a party is seated, leaves and its table is cleared, the table and the count cards change with no reload', async () => {
    clockAt(FRI_1940);
    const { api } = await openApp('/host/floor', { before: (a) => join(a, 'Kulkarni', 6) });
    expect(await screen.findByText(reading('Free tables', '22'))).toBeInTheDocument();

    await seat(api, 'W001', 'T19');
    await twentySecondsPass();
    expect(within(tableButton('T19')).getByText('W001')).toBeInTheDocument();
    expect(screen.getByText(reading('Free tables', '21'))).toBeInTheDocument();
    expect(screen.getByText(reading('Seated', '1', 'parties eating'))).toBeInTheDocument();

    await leave(api, 'T19');
    await twentySecondsPass();
    expect(within(tableButton('T19')).getByText('to clear')).toBeInTheDocument();
    expect(screen.getByText(reading('Seated', '0', 'nobody seated yet'))).toBeInTheDocument();

    await clear(api, 'T19');
    await twentySecondsPass();
    expect(within(tableButton('T19')).getByText('6 seats')).toBeInTheDocument();
    expect(screen.getByText(reading('Free tables', '22'))).toBeInTheDocument();
  });

  test('as 20 seconds pass, a seated table\'s minutes and "Longest sitting" grow on their own', async () => {
    clockAt(new Date(FRI_1940.getTime() - 12 * MINUTE));
    await openApp('/host/floor', {
      before: async (api) => {
        await join(api, 'Kulkarni', 6);
        await seat(api, 'W001', 'T19');
        jump(12 * MINUTE + 50 * 1000);
      },
    });
    expect(await within(await screen.findByRole('button', { name: /^Table T19,/ })).findByText('12 min')).toBeInTheDocument();
    expect(screen.getByText(reading('Longest sitting', '12 min'))).toBeInTheDocument();
    await twentySecondsPass();
    expect(within(tableButton('T19')).getByText('13 min')).toBeInTheDocument();
    expect(screen.getByText(reading('Longest sitting', '13 min'))).toBeInTheDocument();
  });

  test('before the floor is read neither the count cards nor the tables are drawn, then they appear together', async () => {
    await openApp('/host/floor');
    expect(screen.queryByText('Total tables')).not.toBeInTheDocument();
    expect(screen.queryByText('Free tables')).not.toBeInTheDocument();
    expect(tableButtons()).toHaveLength(0);
    expect(await screen.findByText(reading('Total tables', '22'))).toBeInTheDocument();
    expect(tableButtons()).toHaveLength(22);
  });

  test('each table is a button named like "Table T01, 2 seats, free", and Tab reaches them in turn', async () => {
    await openApp('/host/floor');
    expect(await screen.findByRole('button', { name: 'Table T01, 2 seats, free' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Table T11, 4 seats, free' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Table T19, 6 seats, free' })).toBeInTheDocument();
    expect(tableButtons()).toHaveLength(22);
    const user = person();
    for (let i = 0; i < 30 && document.activeElement !== tableButton('T01'); i += 1) await user.tab();
    expect(tableButton('T01')).toHaveFocus();
    await user.tab();
    expect(tableButton('T02')).toHaveFocus();
  });
});
