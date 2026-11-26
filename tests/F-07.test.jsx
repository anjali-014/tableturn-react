import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { FRI_1940, MINUTE, clear, clockAt, jump, join, leave, person, seat, twentySecondsPass } from './given.js';
import { reading, wordsOf } from './look.js';

const drawer = () => screen.getByRole('dialog');
const partyToSeat = () => within(drawer()).getByRole('button', { name: /^Party to seat/ });
const seatButton = () => within(drawer()).getByRole('button', { name: 'Seat' });
const waitlistTab = () => screen.getByRole('link', { name: /^Waitlist/ });

/** Opens the floor with `before`, then the drawer of one table. */
async function openTable(no, before) {
  const app = await openApp('/host/floor', { before });
  const user = person();
  await user.click(await screen.findByRole('button', { name: new RegExp(`^Table ${no},`) }));
  await within(drawer()).findByText(/ · \d seats$/);
  return { ...app, user };
}

/** Picks a party in the drawer's drop-down. */
async function choose(user, label) {
  await user.click(partyToSeat());
  await user.click(screen.getByRole('option', { name: new RegExp(label) }));
}

const kulkarniAndShah = async (api) => {
  await join(api, 'Kulkarni', 6);
  await join(api, 'Shah', 2);
};

afterEach(() => vi.useRealTimers());

describe('F-07 · Seating a party', () => {
  test('with nobody on the list the drawer says "Nobody is on the list yet." and links to the Waitlist page', async () => {
    const { user, address } = await openTable('T07');
    const d = drawer();
    expect(await within(d).findByText(reading('Nobody is on the list yet.', 'Add a party to the waitlist', 'to seat them here.'))).toBeInTheDocument();
    await user.click(within(d).getByRole('link', { name: 'Add a party to the waitlist' }));
    expect(address()).toBe('/host/waitlist');
  });

  test('with parties on the list, T19\'s drawer shows "Seat a party at T19", the first waiting party already chosen, and "Seat"', async () => {
    await openTable('T19', kulkarniAndShah);
    const d = drawer();
    expect(await within(d).findByText('Seat a party at T19')).toBeInTheDocument();
    expect(partyToSeat()).toHaveTextContent('W001 · Kulkarni');
    expect(partyToSeat()).toHaveAccessibleName('Party to seat: W001 · Kulkarni');
    expect(seatButton()).toBeInTheDocument();
  });

  test('the drop-down "Party to seat" lists every party, waiting ones first, each with its covers and state, and ticks the chosen one', async () => {
    const { user } = await openTable('T19', async (api) => {
      await kulkarniAndShah(api);
      await join(api, 'Mehta', 4);
      await seat(api, 'W002', 'T01');
    });
    await within(drawer()).findByText('Seat a party at T19');
    await user.click(partyToSeat());
    const list = screen.getByRole('listbox', { name: 'Party to seat' });
    const options = within(list).getAllByRole('option').map(wordsOf);
    expect([...options].sort()).toEqual([
      'W001 · Kulkarni 6 covers · waiting',
      'W002 · Shah 2 covers · seated',
      'W003 · Mehta 4 covers · waiting',
    ]);
    // the waiting parties come before the one already seated
    expect(options[2]).toBe('W002 · Shah 2 covers · seated');
    const chosen = within(list).getAllByRole('option', { selected: true });
    expect(chosen).toHaveLength(1);
    expect(wordsOf(partyToSeat())).toBe(wordsOf(chosen[0]).replace(/ \d covers · \w+$/, ''));
  });

  test('seating the Kulkarnis (6) at T19 says "W001 seated at T19 after waiting 14 min." and T19 turns seated everywhere', async () => {
    clockAt(FRI_1940);
    const { user } = await openTable('T19', async (api) => {
      await join(api, 'Kulkarni', 6);
      await join(api, 'Shah', 2);
      jump(14 * MINUTE);
    });
    expect(await within(waitlistTab()).findByText('2')).toBeInTheDocument();
    await choose(user, 'W001 · Kulkarni');
    await user.click(seatButton());
    const d = drawer();
    expect(await within(d).findByText('W001 seated at T19 after waiting 14 min.')).toBeInTheDocument();
    expect(await within(d).findByText(reading('State', 'Seated'))).toBeInTheDocument();
    expect(within(d).getByText(reading('Party', 'W001'))).toBeInTheDocument();
    expect(within(d).getByText(reading('Seated for', '0 min'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Table T19, 6 seats, seated/ })).toBeInTheDocument();
    expect(await within(waitlistTab()).findByText('1')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(waitlistTab());
    const onTheList = await screen.findByRole('region', { name: /^On the list now/ });
    expect(await within(onTheList).findByText('W002')).toBeInTheDocument();
    expect(within(onTheList).queryByText('W001')).not.toBeInTheDocument();
  });

  test('seating the Kulkarnis (6) at the two-top T01 says "That table is too small"', async () => {
    const { user } = await openTable('T01', kulkarniAndShah);
    await within(drawer()).findByText('Seat a party at T01');
    await choose(user, 'W001 · Kulkarni');
    await user.click(seatButton());
    expect(await within(drawer()).findByText('That table is too small')).toBeInTheDocument();
    expect(within(drawer()).getByText('Table T01 seats 2; the party has 6. Pick a table with more seats.')).toBeInTheDocument();
  });

  test('seating a party at T19 while a party sits there says "That table is not ready"', async () => {
    const { user } = await openTable('T19', async (api) => {
      await kulkarniAndShah(api);
      await seat(api, 'W001', 'T19');
    });
    await within(drawer()).findByText('Seat a party at T19');
    await choose(user, 'W002 · Shah');
    await user.click(seatButton());
    expect(await within(drawer()).findByText('That table is not ready')).toBeInTheDocument();
    expect(within(drawer()).getByText('Table T19 has not been cleared since its last party. It needs clearing first.')).toBeInTheDocument();
  });

  test('seating a party at T19 after its party has left, before it is wiped, says "That table is not ready"', async () => {
    const { user } = await openTable('T19', async (api) => {
      await kulkarniAndShah(api);
      await seat(api, 'W001', 'T19');
      await leave(api, 'T19');
    });
    await within(drawer()).findByText('Seat a party at T19');
    await choose(user, 'W002 · Shah');
    await user.click(seatButton());
    expect(await within(drawer()).findByText('That table is not ready')).toBeInTheDocument();
    expect(within(drawer()).getByText('Table T19 has not been cleared since its last party. It needs clearing first.')).toBeInTheDocument();
  });

  test('choosing W001, already seated, at another free table says "That party is already at a table"', async () => {
    const { user } = await openTable('T20', async (api) => {
      await kulkarniAndShah(api);
      await seat(api, 'W001', 'T19');
    });
    await within(drawer()).findByText('Seat a party at T20');
    await choose(user, 'W001 · Kulkarni');
    await user.click(seatButton());
    expect(await within(drawer()).findByText('That party is already at a table')).toBeInTheDocument();
    expect(within(drawer()).getByText('Party W001 is already at a table.')).toBeInTheDocument();
  });

  test('seating Shah (2) at the four-top T11 while W003, a party of 4, waits says "A larger party must be seated first"', async () => {
    const { user } = await openTable('T11', async (api) => {
      await kulkarniAndShah(api);
      await join(api, 'Mehta', 4);
    });
    await within(drawer()).findByText('Seat a party at T11');
    await choose(user, 'W002 · Shah');
    await user.click(seatButton());
    expect(await within(drawer()).findByText('A larger party must be seated first')).toBeInTheDocument();
    expect(within(drawer()).getByText('A smaller party cannot take a larger table here: party W003 is waiting and fits table T11.')).toBeInTheDocument();
  });

  test('with no larger party that fits waiting, a party of two is seated at a four-top', async () => {
    const { user } = await openTable('T11', kulkarniAndShah);
    await within(drawer()).findByText('Seat a party at T11');
    await choose(user, 'W002 · Shah');
    await user.click(seatButton());
    expect(await within(drawer()).findByText('W002 seated at T11 after waiting 0 min.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Table T11, 4 seats, seated/ })).toBeInTheDocument();
  });

  test('choosing another party in the drop-down takes the refusal away', async () => {
    const { user } = await openTable('T01', kulkarniAndShah);
    await within(drawer()).findByText('Seat a party at T01');
    await choose(user, 'W001 · Kulkarni');
    await user.click(seatButton());
    expect(await within(drawer()).findByText('That table is too small')).toBeInTheDocument();
    await choose(user, 'W002 · Shah');
    expect(within(drawer()).queryByText('That table is too small')).not.toBeInTheDocument();
    expect(partyToSeat()).toHaveTextContent('W002 · Shah');
  });

  test('a refused seating changes nothing on the floor or the lists', async () => {
    const { user } = await openTable('T01', kulkarniAndShah);
    await within(drawer()).findByText('Seat a party at T01');
    await choose(user, 'W001 · Kulkarni');
    await user.click(seatButton());
    expect(await within(drawer()).findByText('That table is too small')).toBeInTheDocument();
    await user.click(within(drawer()).getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('button', { name: 'Table T01, 2 seats, free' })).toBeInTheDocument();
    expect(screen.getByText(reading('Free tables', '22'))).toBeInTheDocument();
    expect(within(waitlistTab()).getByText('2')).toBeInTheDocument();
    await user.click(waitlistTab());
    const onTheList = await screen.findByRole('region', { name: /^On the list now/ });
    expect(await within(onTheList).findByText('W001')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /^Seated tonight/ })).not.toBeInTheDocument();
  });

  test('once a party is seated, "Seated tonight" lists it: W001, Kulkarni, 6, T19, 40 min, 14 min, seated, then left, then cleared', async () => {
    clockAt(FRI_1940);
    const { api } = await openApp('/host/waitlist', {
      before: async (a) => {
        await join(a, 'Kulkarni', 6);
        jump(14 * MINUTE);
        await seat(a, 'W001', 'T19');
      },
    });
    const region = await screen.findByRole('region', { name: /^Seated tonight/ });
    expect(screen.getByRole('heading', { name: /^Seated tonight/ })).toHaveTextContent(/^Seated tonight\s*1$/);
    const table = within(region).getByRole('table');
    expect(within(table).getAllByRole('columnheader').map(wordsOf).filter(Boolean))
      .toEqual(['Party', 'Name', 'Covers', 'Table', 'Quoted', 'Waited', 'Now']);
    const cells = () => within(within(table).getAllByRole('row')[1]).getAllByRole('cell').map(wordsOf).slice(0, 7);
    expect(cells()).toEqual(['W001', 'Kulkarni', '6', 'T19', '40 min', '14 min', 'seated']);
    await leave(api, 'T19');
    await twentySecondsPass();
    expect(cells()[6]).toBe('left');
    await clear(api, 'T19');
    await twentySecondsPass();
    expect(cells()[6]).toBe('cleared');
  });

  test('with nobody seated yet there is no "Seated tonight" section', async () => {
    clockAt(FRI_1940);
    const { api } = await openApp('/host/waitlist', { before: kulkarniAndShah });
    expect(await screen.findByRole('region', { name: /^On the list now/ })).toBeInTheDocument();
    await within(screen.getByRole('region', { name: /^On the list now/ })).findByText('W001');
    expect(screen.queryByText(/^Seated tonight/)).not.toBeInTheDocument();
    await seat(api, 'W001', 'T19');
    await twentySecondsPass();
    expect(await screen.findByRole('heading', { name: /^Seated tonight/ })).toBeInTheDocument();
  });

  test('Esc closes the open drop-down, the choice stays, and the drawer stays open', async () => {
    const { user } = await openTable('T19', kulkarniAndShah);
    await within(drawer()).findByText('Seat a party at T19');
    await choose(user, 'W001 · Kulkarni');
    await user.click(partyToSeat());
    expect(screen.getByRole('listbox', { name: 'Party to seat' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(partyToSeat()).toHaveTextContent('W001 · Kulkarni');
  });

  test('a click outside the open drop-down closes it, the choice stays, and the drawer stays open', async () => {
    const { user } = await openTable('T19', kulkarniAndShah);
    await within(drawer()).findByText('Seat a party at T19');
    await choose(user, 'W001 · Kulkarni');
    await user.click(partyToSeat());
    await user.click(within(drawer()).getByRole('heading', { name: 'T19' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(partyToSeat()).toHaveTextContent('W001 · Kulkarni');
  });
});
