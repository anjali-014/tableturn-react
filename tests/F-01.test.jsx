import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { openApp } from './app.jsx';
import { join, leave, person, seat, tablesFrom } from './given.js';
import { reading } from './look.js';

const card = (name) => screen.getByRole('link', { name: new RegExp(`Continue as ${name}`) });

describe('F-01 · The front door', () => {
  test('the welcome page names Kothari\'s and says what TableTurn is', async () => {
    await openApp('/');
    expect(screen.getByText("Kothari's · Baner, Pune")).toBeInTheDocument();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(within(heading).getByText('Twenty-two tables.')).toBeInTheDocument();
    expect(within(heading).getByText('No wipe-clean board.')).toBeInTheDocument();
    expect(screen.getByText(/^Every party gets a place in the queue and an honest wait/)).toBeInTheDocument();
  });

  test('on a fresh evening the counts read 22 tables, 22 free right now and 0 in use', async () => {
    await openApp('/');
    expect(await screen.findByText(reading('22', 'free right now'))).toBeInTheDocument();
    expect(screen.getByText(reading('22', 'tables'))).toBeInTheDocument();
    expect(screen.getByText(reading('0', 'in use'))).toBeInTheDocument();
  });

  test('with one table seated and another waiting to be cleared, free right now shows 20 and in use shows 2', async () => {
    await openApp('/', {
      before: async (api) => {
        await join(api, 'Kulkarni', 6);
        await join(api, 'Shah', 2);
        await seat(api, 'W001', 'T19');
        await seat(api, 'W002', 'T01');
        await leave(api, 'T01');
      },
    });
    expect(await screen.findByText(reading('20', 'free right now'))).toBeInTheDocument();
    expect(screen.getByText(reading('2', 'in use'))).toBeInTheDocument();
    expect(screen.getByText(reading('22', 'tables'))).toBeInTheDocument();
  });

  test('the drawing shows the table tops T01 to T04, T11 to T13 and T19, and no other table', async () => {
    await openApp('/');
    await screen.findByText('T01');
    for (const no of [...tablesFrom('T01', 'T04'), ...tablesFrom('T11', 'T13'), 'T19']) {
      expect(screen.getByText(no)).toBeInTheDocument();
    }
    expect(screen.getAllByText(/^T\d\d$/)).toHaveLength(8);
  });

  test('the drawing is only a picture: clicking a table top does nothing', async () => {
    const { address } = await openApp('/');
    const user = person();
    await user.click(await screen.findByText('T01'));
    await user.click(screen.getByText('T19'));
    expect(address()).toBe('/');
    expect(screen.getByText('Who are you today?')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('before the floor is read the counts show 0 and the drawing is empty, then both fill in', async () => {
    await openApp('/');
    expect(screen.getByText(reading('0', 'tables'))).toBeInTheDocument();
    expect(screen.getByText(reading('0', 'free right now'))).toBeInTheDocument();
    expect(screen.queryByText('T01')).not.toBeInTheDocument();
    expect(await screen.findByText(reading('22', 'tables'))).toBeInTheDocument();
    expect(screen.getByText(reading('22', 'free right now'))).toBeInTheDocument();
    expect(screen.getByText('T01')).toBeInTheDocument();
  });

  test('under "Who are you today?" there is one card each for Meera, Joseph, a guest and Ravi', async () => {
    await openApp('/');
    expect(screen.getByText('Who are you today?')).toBeInTheDocument();
    expect(screen.getByText('Each person sees their own screens. Everything they do changes the same floor.')).toBeInTheDocument();
    const cards = [
      ['Meera', 'Meera', 'Host', 'Runs the host stand. Sees every table, keeps the waitlist and seats each party.'],
      ['Joseph', 'Joseph', 'Floor staff', 'Works the floor. Marks a table when the party leaves, and again once it is wiped.'],
      ['a guest', 'A guest', 'Guest', 'Gives a name at the stand. Sees the wait they were quoted and, once seated, the wait they had.'],
      ['Ravi', 'Ravi', 'Manager', 'Owns the restaurant. Reads every party’s record.'],
    ];
    for (const [who, name, role, line] of cards) {
      const link = card(who);
      expect(within(link).getByText(name)).toBeInTheDocument();
      expect(within(link).getByText(role)).toBeInTheDocument();
      expect(within(link).getByText(line)).toBeInTheDocument();
      expect(within(link).getByText(`Continue as ${who}`)).toBeInTheDocument();
    }
  });

  test('"Continue as Meera" opens Meera\'s floor at /host/floor', async () => {
    const { address } = await openApp('/');
    await person().click(card('Meera'));
    expect(address()).toBe('/host/floor');
  });

  test('"Continue as Joseph" opens Joseph\'s tables at /staff', async () => {
    const { address } = await openApp('/');
    await person().click(card('Joseph'));
    expect(address()).toBe('/staff');
  });

  test('"Continue as a guest" opens the guest\'s wait at /guest', async () => {
    const { address } = await openApp('/');
    await person().click(card('a guest'));
    expect(address()).toBe('/guest');
  });

  test('"Continue as Ravi" opens Ravi\'s board at /manager/board', async () => {
    const { address } = await openApp('/');
    await person().click(card('Ravi'));
    expect(address()).toBe('/manager/board');
  });

  test('Tab reaches the four person cards in order, and Enter opens the one in focus', async () => {
    const { address } = await openApp('/');
    const user = person();
    const meera = card('Meera');
    for (let i = 0; i < 20 && document.activeElement !== meera; i += 1) await user.tab();
    expect(meera).toHaveFocus();
    await user.tab();
    expect(card('Joseph')).toHaveFocus();
    await user.tab();
    expect(card('a guest')).toHaveFocus();
    await user.tab();
    expect(card('Ravi')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(address()).toBe('/manager/board');
  });
});
