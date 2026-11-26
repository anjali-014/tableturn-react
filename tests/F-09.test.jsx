import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { FRI_1940, MINUTE, clear, clockAt, jump, join, leave, person, seat, twentySecondsPass } from './given.js';
import { reading, wordsOf } from './look.js';

const partyButton = (id) => screen.getByRole('button', { name: new RegExp(`^${id}`) });

/** The Kulkarnis (6) join at 19:40 and the clock moves on by `minutes`; the guest opens My wait and picks W001. */
async function kulkarniWaiting(minutes, more) {
  clockAt(FRI_1940);
  const app = await openApp('/guest', {
    before: async (api) => {
      await join(api, 'Kulkarni', 6);
      if (more) await more(api);
      jump(minutes * MINUTE);
    },
  });
  const user = person();
  await user.click(await screen.findByRole('button', { name: /^W001/ }));
  await screen.findByText('Party W001');
  return { ...app, user };
}

afterEach(() => vi.useRealTimers());

describe('F-09 · The guest\'s own screen', () => {
  test('with no party chosen, /guest asks "Which party are you?" with a button per party, newest first', async () => {
    await openApp('/guest', {
      before: async (api) => {
        await join(api, 'Kulkarni', 6);
        await join(api, 'Shah', 2);
      },
    });
    expect(screen.getByText("Kothari's · your table")).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'My wait' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Which party are you?' })).toBeInTheDocument();
    const first = await screen.findByRole('button', { name: /^W002/ });
    const kulkarni = partyButton('W001');
    expect(wordsOf(first)).toBe('W002 Shah 2 covers · waiting');
    expect(within(kulkarni).getByText('W001')).toBeInTheDocument();
    expect(within(kulkarni).getByText('Kulkarni')).toBeInTheDocument();
    expect(within(kulkarni).getByText('6 covers · waiting')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^W\d{3}/ })).toEqual([first, kulkarni]);
  });

  test('a party of one reads "1 cover · waiting" on its button', async () => {
    await openApp('/guest', { before: (api) => join(api, 'Iyer', 1) });
    const iyer = await screen.findByRole('button', { name: /^W001/ });
    expect(within(iyer).getByText('1 cover · waiting')).toBeInTheDocument();
  });

  test('with nobody on the list it says "No party on the list yet"', async () => {
    await openApp('/guest');
    expect(await screen.findByText('No party on the list yet')).toBeInTheDocument();
    expect(screen.getByText('Add one as Meera, the host, then come back and be that guest.')).toBeInTheDocument();
  });

  test('clicking W001 Kulkarni gives way to the card: "Party W001", "Kulkarni · 6 covers", "Place" 1, and the header names the Kulkarni party', async () => {
    await kulkarniWaiting(0);
    expect(screen.queryByRole('heading', { name: 'Which party are you?' })).not.toBeInTheDocument();
    expect(screen.getByText('Party W001')).toBeInTheDocument();
    expect(screen.getByText('Kulkarni · 6 covers')).toBeInTheDocument();
    expect(screen.getByText(reading('Place', '1'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kulkarni party/ })).toBeInTheDocument();
  });

  test('while waiting the card reads "40 min quoted", "Waiting 12 min so far · joined at 19:40" and "Meera will call Kulkarni when a table is ready."', async () => {
    await kulkarniWaiting(12);
    expect(screen.getByText(reading('40', 'min quoted'))).toBeInTheDocument();
    expect(screen.getByText(reading('Waiting', '12 min', 'so far · joined at 19:40'))).toBeInTheDocument();
    expect(screen.getByText('Meera will call Kulkarni when a table is ready.')).toBeInTheDocument();
    expect(screen.queryByText(/past the quote/)).not.toBeInTheDocument();
  });

  test('past the quote the line adds "5 min past the quote"', async () => {
    await kulkarniWaiting(45);
    expect(screen.getByText(reading('Waiting', '45 min', 'so far · joined at 19:40', '·', '5 min past the quote'))).toBeInTheDocument();
  });

  test('as minutes pass, the waiting minutes grow on their own every 20 seconds', async () => {
    clockAt(FRI_1940);
    await openApp('/guest', {
      before: async (api) => {
        await join(api, 'Kulkarni', 6);
        jump(12 * MINUTE + 50 * 1000);
      },
    });
    await person().click(await screen.findByRole('button', { name: /^W001/ }));
    expect(await screen.findByText(reading('Waiting', '12 min', 'so far · joined at 19:40'))).toBeInTheDocument();
    await twentySecondsPass();
    expect(screen.getByText(reading('Waiting', '13 min', 'so far · joined at 19:40'))).toBeInTheDocument();
  });

  test('once Meera seats the party, the card shows "Quoted" 40 min, "Waited" 14 min and "Table" T19, and the minutes stop', async () => {
    const { api } = await kulkarniWaiting(14);
    await seat(api, 'W001', 'T19');
    await twentySecondsPass();
    expect(screen.getByText(reading('Quoted', '40 min'))).toBeInTheDocument();
    expect(screen.getByText(reading('Waited', '14 min'))).toBeInTheDocument();
    expect(screen.getByText(reading('Table', 'T19'))).toBeInTheDocument();
    expect(screen.getByText('Enjoy your meal. The wait was stamped when you sat down and never changes after.')).toBeInTheDocument();
    expect(screen.queryByText(/so far/)).not.toBeInTheDocument();
    jump(10 * MINUTE);
    await twentySecondsPass();
    expect(screen.getByText(reading('Waited', '14 min'))).toBeInTheDocument();
  });

  test('once the party has left, and once its table is cleared, the foot says "Thanks for coming to Kothari\'s."', async () => {
    const { api } = await kulkarniWaiting(14, async (a) => {
      await seat(a, 'W001', 'T19');
      await leave(a, 'T19');
    });
    expect(screen.getByText("Thanks for coming to Kothari's.")).toBeInTheDocument();
    await clear(api, 'T19');
    await twentySecondsPass();
    expect(screen.getByText("Thanks for coming to Kothari's.")).toBeInTheDocument();
    expect(screen.getByText(reading('Table', 'T19'))).toBeInTheDocument();
  });
});
