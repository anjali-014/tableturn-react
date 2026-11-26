import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openAnotherScreen, openApp } from './app.jsx';
import { MINUTE, clockAt, jump, join, leave, person, seat, twentySecondsPass } from './given.js';
import { reading } from './look.js';

/** Friday 6 November 2026, 20:38 at Kothari's: the Kulkarnis sit down at T19; they get up 42 minutes later, at 21:20. */
const FRI_2038 = new Date('2026-11-06T20:38:00+05:30');

const drawer = () => screen.getByRole('dialog');
const leaveButton = () => within(drawer()).getByRole('button', { name: 'Leave' });
const clearButton = () => within(drawer()).getByRole('button', { name: 'Clear' });
const t19 = () => screen.getByRole('button', { name: /^Table T19,/ });

/** The Kulkarnis sit at T19 at 20:38 and it is now 21:20; Joseph opens T19 on his page. */
async function josephAtT19(more) {
  clockAt(FRI_2038);
  const app = await openApp('/staff', {
    before: async (api) => {
      await join(api, 'Kulkarni', 6);
      await seat(api, 'W001', 'T19');
      if (more) await more(api);
      jump(42 * MINUTE);
    },
  });
  const user = person();
  await user.click(await screen.findByRole('button', { name: /^Table T19,/ }));
  await within(drawer()).findByText('Seating S001');
  return { ...app, user };
}

afterEach(() => vi.useRealTimers());

describe('F-08 · The floor staff\'s view', () => {
  test('/staff reads "Joseph\'s section of the floor" over "Tables", with the same cards, filters, find box and floor, and no section tabs', async () => {
    await openApp('/staff');
    expect(screen.getByText("Joseph's section of the floor")).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Tables' })).toBeInTheDocument();
    expect(await screen.findByText(reading('Total tables', '22'))).toBeInTheDocument();
    expect(screen.getByText(reading('Free tables', '22'))).toBeInTheDocument();
    for (const name of ['All sections', 'Garden', 'Any state', 'Uncleared']) expect(screen.getByRole('button', { name })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Table number' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Table T\d\d,/ })).toHaveLength(22);
    expect(screen.queryByRole('link', { name: /^The floor/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Waitlist/ })).not.toBeInTheDocument();
  });

  test('a fifth card, "To clear", counts the tables left and not wiped, with "left, not yet wiped", on Joseph\'s page and Meera\'s', async () => {
    const twoLeft = async (api) => {
      await join(api, 'Kulkarni', 6);
      await join(api, 'Shah', 2);
      await join(api, 'Mehta', 2);
      await seat(api, 'W001', 'T19');
      await seat(api, 'W002', 'T01');
      await seat(api, 'W003', 'T02');
      await leave(api, 'T19');
      await leave(api, 'T01');
    };
    await openApp('/staff', { before: twoLeft });
    expect(await screen.findByText(reading('To clear', '2', 'left, not yet wiped'))).toBeInTheDocument();
    cleanup();
    await openApp('/host/floor', { before: twoLeft });
    expect(await screen.findByText(reading('To clear', '2', 'left, not yet wiped'))).toBeInTheDocument();
    cleanup();
    await openApp('/host/floor');
    expect(await screen.findByText(reading('To clear', '0', 'left, not yet wiped'))).toBeInTheDocument();
  });

  test('a free table nobody has been seated at from this drawer says "Free. Nothing to mark here until a party is seated."', async () => {
    await openApp('/staff');
    await person().click(await screen.findByRole('button', { name: /^Table T07,/ }));
    expect(await within(drawer()).findByText('Free. Nothing to mark here until a party is seated.')).toBeInTheDocument();
    expect(within(drawer()).queryByRole('button', { name: 'Leave' })).not.toBeInTheDocument();
  });

  test('T19 with a party at it shows "Seating S001" with "Leave" and "Clear"', async () => {
    await josephAtT19();
    expect(within(drawer()).getByText('Seating S001')).toBeInTheDocument();
    expect(leaveButton()).toBeInTheDocument();
    expect(clearButton()).toBeInTheDocument();
  });

  test('"Leave" says "The party left at 21:20. The table needs clearing now." and T19 turns to clear', async () => {
    const { user } = await josephAtT19();
    expect(screen.getByText(reading('To clear', '0'))).toBeInTheDocument();
    expect(screen.getByText(reading('Seated', '1', 'parties eating'))).toBeInTheDocument();
    await user.click(leaveButton());
    expect(await within(drawer()).findByText('The party left at 21:20. The table needs clearing now.')).toBeInTheDocument();
    expect(await within(drawer()).findByText(reading('State', 'Uncleared'))).toBeInTheDocument();
    expect(within(t19()).getByText('to clear')).toBeInTheDocument();
    expect(screen.getByText(reading('To clear', '1'))).toBeInTheDocument();
    expect(screen.getByText(reading('Seated', '0'))).toBeInTheDocument();
  });

  test('"Leave" a second time says "The party has already left"', async () => {
    const { user } = await josephAtT19();
    await user.click(leaveButton());
    await within(drawer()).findByText('The party left at 21:20. The table needs clearing now.');
    await user.click(leaveButton());
    expect(await within(drawer()).findByText('The party has already left')).toBeInTheDocument();
    expect(within(drawer()).getByText('The party of seating S001 has already left. Nothing changed.')).toBeInTheDocument();
    expect(screen.getByText(reading('To clear', '1'))).toBeInTheDocument();
  });

  test('"Clear" before "Leave" says "The party is still at the table" and changes nothing', async () => {
    const { user } = await josephAtT19();
    await user.click(clearButton());
    expect(await within(drawer()).findByText('The party is still at the table')).toBeInTheDocument();
    expect(within(drawer()).getByText('Press Leave when they go; clear the table after that.')).toBeInTheDocument();
    expect(within(drawer()).getByText(reading('State', 'Seated'))).toBeInTheDocument();
    expect(within(t19()).getByText('W001')).toBeInTheDocument();
    expect(screen.getByText(reading('To clear', '0'))).toBeInTheDocument();
  });

  test('"Clear" after the party left says "T19 is free. The party had it for 42 min.", not counting the wiping', async () => {
    const { user } = await josephAtT19();
    await user.click(leaveButton());
    await within(drawer()).findByText('The party left at 21:20. The table needs clearing now.');
    expect(await screen.findByText(reading('Free tables', '21'))).toBeInTheDocument();
    jump(6 * MINUTE);
    await user.click(clearButton());
    expect(await within(drawer()).findByText('T19 is free. The party had it for 42 min.')).toBeInTheDocument();
    expect(await within(t19()).findByText('6 seats')).toBeInTheDocument();
    expect(screen.getByText(reading('To clear', '0'))).toBeInTheDocument();
    expect(screen.getByText(reading('Free tables', '22'))).toBeInTheDocument();
  });

  test('"Clear" a second time says "The table was already cleared"', async () => {
    const { user } = await josephAtT19();
    await user.click(leaveButton());
    await within(drawer()).findByText('The party left at 21:20. The table needs clearing now.');
    await user.click(clearButton());
    await within(drawer()).findByText('T19 is free. The party had it for 42 min.');
    await user.click(clearButton());
    expect(await within(drawer()).findByText('The table was already cleared')).toBeInTheDocument();
    expect(within(drawer()).getByText('Seating S001 has already been cleared. Nothing changed.')).toBeInTheDocument();
  });

  test('once Joseph has cleared T19, Meera finds it free on her floor and can seat a new party there', async () => {
    const { user, address } = await josephAtT19((api) => join(api, 'Mehta', 6));
    await user.click(leaveButton());
    await within(drawer()).findByText('The party left at 21:20. The table needs clearing now.');
    await user.click(clearButton());
    await within(drawer()).findByText('T19 is free. The party had it for 42 min.');
    await user.click(within(drawer()).getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: /Joseph/ }));
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /Meera/ }));
    expect(address()).toBe('/host/floor');
    await user.click(await screen.findByRole('button', { name: 'Table T19, 6 seats, free' }));
    await within(drawer()).findByText('Seat a party at T19');
    await user.click(within(drawer()).getByRole('button', { name: /^Party to seat/ }));
    await user.click(screen.getByRole('option', { name: /W002/ }));
    await user.click(within(drawer()).getByRole('button', { name: 'Seat' }));
    expect(await within(drawer()).findByText(/^W002 seated at T19/)).toBeInTheDocument();
  });

  test('when Joseph marks T19 on his page, Meera\'s floor open on another screen changes too, with no reload', async () => {
    const joseph = await josephAtT19();
    const meera = await openAnotherScreen('/host/floor');
    const meeraT19 = () => meera.getByRole('button', { name: /^Table T19,/ });
    expect(await within(await meera.findByRole('button', { name: /^Table T19,/ })).findByText('W001')).toBeInTheDocument();
    expect(meera.getByText(reading('To clear', '0'))).toBeInTheDocument();
    await joseph.user.click(joseph.on.getByRole('button', { name: 'Leave' }));
    await joseph.on.findByText('The party left at 21:20. The table needs clearing now.');
    await twentySecondsPass();
    expect(within(meeraT19()).getByText('to clear')).toBeInTheDocument();
    expect(meera.getByText(reading('To clear', '1'))).toBeInTheDocument();
    expect(meera.getByText(reading('Seated', '0'))).toBeInTheDocument();
  });
});
