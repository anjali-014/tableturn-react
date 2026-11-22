import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { FRI_1940, clockAt, join, person, seat, twentySecondsPass } from './given.js';

const personButton = (name) => screen.getByRole('button', { name: new RegExp(name) });

async function openMenu(path = '/staff', options) {
  const app = await openApp(path, options);
  const user = person();
  await user.click(personButton(path === '/staff' ? 'Joseph' : 'Meera'));
  return { ...app, user, menu: screen.getByRole('menu') };
}

const guestOption = (menu) => within(menu).getByRole('menuitem', { name: /Guest/ });

/** Tabs to the guest option and presses Enter, as the keyboard does. */
async function openPartiesByKeyboard(user, menu) {
  const option = guestOption(menu);
  for (let i = 0; i < 10 && document.activeElement !== option; i += 1) await user.tab();
  expect(option).toHaveFocus();
  await user.keyboard('{Enter}');
}

const twoParties = async (api) => {
  await join(api, 'Kulkarni', 6);
  await join(api, 'Shah', 2);
};

afterEach(() => vi.useRealTimers());

describe('F-02 · Moving between people', () => {
  test('every page has the TableTurn mark with "Kothari\'s · Baner", and clicking it opens the welcome page', async () => {
    const { address } = await openApp('/staff');
    const home = screen.getByRole('link', { name: 'TableTurn home' });
    expect(within(home).getByText('TableTurn')).toBeInTheDocument();
    expect(within(home).getByText("Kothari's · Baner")).toBeInTheDocument();
    await person().click(home);
    expect(address()).toBe('/');
    expect(screen.getByRole('link', { name: 'TableTurn home' })).toBeInTheDocument();
  });

  test('on the welcome page the header has no back arrow and no person button', async () => {
    await openApp('/');
    expect(screen.getByRole('link', { name: 'TableTurn home' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to the home page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Meera|Joseph|Guest|Ravi/ })).not.toBeInTheDocument();
  });

  test('on /staff the back arrow comes before the TableTurn name, and the person button shows J, Joseph and Floor staff', async () => {
    await openApp('/staff');
    const user = person();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Back to the home page' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'TableTurn home' })).toHaveFocus();
    const button = personButton('Joseph');
    expect(within(button).getByText('J')).toBeInTheDocument();
    expect(within(button).getByText('Joseph')).toBeInTheDocument();
    expect(within(button).getByText('Floor staff')).toBeInTheDocument();
  });

  test('the back arrow on a person\'s screen opens the welcome page', async () => {
    const { address } = await openApp('/host/floor');
    await person().click(screen.getByRole('link', { name: 'Back to the home page' }));
    expect(address()).toBe('/');
    expect(screen.queryByRole('link', { name: 'Back to the home page' })).not.toBeInTheDocument();
  });

  test('the person button opens "View the restaurant as" with the four people and their roles', async () => {
    const { menu } = await openMenu();
    expect(within(menu).getByText('View the restaurant as')).toBeInTheDocument();
    const options = within(menu).getAllByRole('menuitem');
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveAccessibleName(/Meera.*Host/);
    expect(options[1]).toHaveAccessibleName(/Joseph.*Floor staff/);
    expect(options[2]).toHaveAccessibleName(/A guest.*Guest/);
    expect(options[3]).toHaveAccessibleName(/Ravi.*Manager/);
  });

  test('in the person menu the person whose screens these are is marked as the current one', async () => {
    const { menu } = await openMenu();
    expect(within(menu).getByRole('menuitem', { name: /Joseph/, current: true })).toBeInTheDocument();
    for (const name of [/Meera/, /A guest/, /Ravi/]) {
      expect(within(menu).getByRole('menuitem', { name, current: false })).toBeInTheDocument();
    }
  });

  test('choosing Ravi closes the menu and opens his board at /manager/board', async () => {
    const { user, menu, address } = await openMenu();
    await user.click(within(menu).getByRole('menuitem', { name: /Ravi/ }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(address()).toBe('/manager/board');
    expect(personButton('Ravi')).toBeInTheDocument();
  });

  test('a click outside the person menu closes it and nothing else changes', async () => {
    const { user, address } = await openMenu();
    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(address()).toBe('/staff');
    expect(personButton('Joseph')).toBeInTheDocument();
  });

  test('Esc closes the person menu and nothing else changes', async () => {
    const { user, address } = await openMenu();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(address()).toBe('/staff');
    expect(personButton('Joseph')).toBeInTheDocument();
  });

  test('pointing at the guest option opens "Be the guest of" with tonight\'s parties, newest first', async () => {
    const { user, menu } = await openMenu('/staff', { before: twoParties });
    await user.hover(guestOption(menu));
    expect(await screen.findByText('Be the guest of')).toBeInTheDocument();
    const parties = screen.getAllByRole('option');
    expect(parties).toHaveLength(2);
    expect(within(parties[0]).getByText('W002')).toBeInTheDocument();
    expect(within(parties[0]).getByText('Shah')).toBeInTheDocument();
    expect(within(parties[0]).getByText('2')).toBeInTheDocument();
    expect(within(parties[1]).getByText('W001')).toBeInTheDocument();
    expect(within(parties[1]).getByText('Kulkarni')).toBeInTheDocument();
    expect(within(parties[1]).getByText('6')).toBeInTheDocument();
  });

  test('clicking the guest option opens "Be the guest of" with tonight\'s parties', async () => {
    const { user, menu } = await openMenu('/staff', { before: twoParties });
    await user.click(guestOption(menu));
    expect(screen.getByText('Be the guest of')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  test('Enter on the guest option opens the parties, as a click does', async () => {
    const { user, menu } = await openMenu('/staff', { before: twoParties });
    await openPartiesByKeyboard(user, menu);
    expect(await screen.findByText('Be the guest of')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  test('with nobody on the list the guest\'s list says "Nobody is on the list yet. Add a party as Meera, the host."', async () => {
    const { user, menu } = await openMenu();
    await openPartiesByKeyboard(user, menu);
    expect(screen.getByText('Nobody is on the list yet. Add a party as Meera, the host.')).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  test('choosing W001 Kulkarni closes the menu, opens My wait at /guest and names the Kulkarni party in the header', async () => {
    const { user, menu, address } = await openMenu('/staff', { before: twoParties });
    await openPartiesByKeyboard(user, menu);
    await user.click(await screen.findByRole('option', { name: /W001.*Kulkarni/ }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(address()).toBe('/guest');
    const button = personButton('Kulkarni party');
    expect(within(button).getByText('Kulkarni party')).toBeInTheDocument();
    expect(within(button).getByText('Guest · W001')).toBeInTheDocument();
    await user.click(button);
    const option = within(screen.getByRole('menu')).getByRole('menuitem', { name: /Kulkarni party/ });
    expect(within(option).getByText('Kulkarni party')).toBeInTheDocument();
    expect(within(option).getByText('Guest · W001')).toBeInTheDocument();
  });

  test('on Meera\'s floor the tabs "The floor" and "Waitlist" sit beside the title, The floor is current, and Waitlist opens', async () => {
    const { address } = await openApp('/host/floor');
    expect(screen.getByRole('link', { name: /^The floor/, current: 'page' })).toBeInTheDocument();
    const waitlist = screen.getByRole('link', { name: /^Waitlist/, current: false });
    await person().click(waitlist);
    expect(address()).toBe('/host/waitlist');
    expect(screen.getByRole('link', { name: /^Waitlist/, current: 'page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^The floor/, current: false })).toBeInTheDocument();
  });

  test('on the Waitlist page the tab "The floor" opens the floor', async () => {
    const { address } = await openApp('/host/waitlist');
    await person().click(screen.getByRole('link', { name: /^The floor/ }));
    expect(address()).toBe('/host/floor');
  });

  test('with three parties waiting the Waitlist tab carries a badge with 3', async () => {
    await openApp('/host/floor', {
      before: async (api) => {
        await twoParties(api);
        await join(api, 'Mehta', 4);
      },
    });
    const tab = screen.getByRole('link', { name: /^Waitlist/ });
    expect(await within(tab).findByText('3')).toBeInTheDocument();
  });

  test('with nobody waiting the Waitlist tab has no badge', async () => {
    await openApp('/host/waitlist', {
      before: async (api) => {
        await join(api, 'Kulkarni', 6);
        await seat(api, 'W001', 'T19');
      },
    });
    await screen.findByRole('link', { name: /^The floor/ });
    await screen.findByRole('link', { name: 'Back to the home page' });
    expect(screen.getByRole('link', { name: /^Waitlist/ })).toHaveAccessibleName('Waitlist');
  });

  test('the Waitlist badge changes as parties join or are seated, with no reload', async () => {
    clockAt(FRI_1940);
    const { api } = await openApp('/host/floor', { before: twoParties });
    const tab = screen.getByRole('link', { name: /^Waitlist/ });
    expect(await within(tab).findByText('2')).toBeInTheDocument();
    await join(api, 'Mehta', 4);
    await twentySecondsPass();
    expect(within(tab).getByText('3')).toBeInTheDocument();
    await seat(api, 'W001', 'T19');
    await seat(api, 'W002', 'T01');
    await twentySecondsPass();
    expect(within(tab).getByText('1')).toBeInTheDocument();
  });

  test('/host leads to /host/floor', async () => {
    const { address } = await openApp('/host');
    expect(address()).toBe('/host/floor');
    expect(personButton('Meera')).toBeInTheDocument();
  });

  test('/manager leads to /manager/board', async () => {
    const { address } = await openApp('/manager');
    expect(address()).toBe('/manager/board');
    expect(personButton('Ravi')).toBeInTheDocument();
  });

  test('an address the app does not have, such as /kitchen, opens the welcome page at /', async () => {
    const { address } = await openApp('/kitchen');
    expect(address()).toBe('/');
    expect(screen.getByRole('link', { name: 'TableTurn home' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to the home page' })).not.toBeInTheDocument();
  });
});
