import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { FRI_1940, MINUTE, clockAt, jump, join, leave, person, seat, twentySecondsPass } from './given.js';
import { reading } from './look.js';

const filter = (name, pressed) => screen.getByRole('button', { name, pressed });
const tableButtons = () => screen.queryAllByRole('button', { name: /^Table T\d\d,/ });
const tableButton = (no) => screen.getByRole('button', { name: new RegExp(`^Table ${no},`) });
const findBox = () => screen.getByRole('textbox', { name: 'Table number' });
const drawer = () => screen.getByRole('dialog');

afterEach(() => vi.useRealTimers());

describe('F-04 · Finding one table', () => {
  test('above the tables are "All sections", "Window", "Garden", "Indoor" and "Any state", "Free", "Seated", "Uncleared", with All sections and Any state pressed', async () => {
    await openApp('/host/floor');
    await screen.findByRole('button', { name: /^Table T01,/ });
    for (const name of ['All sections', 'Any state']) expect(filter(name, true)).toBeInTheDocument();
    for (const name of ['Window', 'Garden', 'Indoor', 'Free', 'Seated', 'Uncleared']) {
      expect(filter(name, false)).toBeInTheDocument();
    }
  });

  test('clicking "Garden" shows only the Garden section, presses Garden, and the address ends in ?section=Garden', async () => {
    const { address } = await openApp('/host/floor');
    await screen.findByRole('button', { name: /^Table T01,/ });
    await person().click(filter('Garden'));
    expect(address()).toBe(`/host/floor${'?section=Garden'}`);
    await screen.findByRole('button', { name: /^Table T05,/ });
    expect(screen.queryByRole('button', { name: /^Table T01,/ })).not.toBeInTheDocument();
    expect(tableButtons()).toHaveLength(8);
    expect(filter('Garden', true)).toBeInTheDocument();
    expect(filter('All sections', false)).toBeInTheDocument();
  });

  test('Garden and then "Free" show only the free Garden tables, with ?section=Garden&state=free and "8 shown · 8 free"', async () => {
    const { address } = await openApp('/host/floor?section=Garden');
    await screen.findByRole('button', { name: /^Table T05,/ });
    await person().click(filter('Free'));
    expect(address()).toBe(`/host/floor${'?section=Garden&state=free'}`);
    expect(await screen.findByText(reading('8 shown · 8 free'))).toBeInTheDocument();
    expect(tableButtons()).toHaveLength(8);
    expect(filter('Free', true)).toBeInTheDocument();
  });

  test('"All sections" and "Any state" take their filter off the floor and the address, and the line counting what is shown goes', async () => {
    const { address } = await openApp('/host/floor?section=Garden&state=free');
    const user = person();
    expect(await screen.findByText(reading('8 shown · 8 free'))).toBeInTheDocument();
    await user.click(filter('All sections'));
    // the section has gone from the address; the state is still there
    expect(address()).not.toMatch(/section=/);
    expect(address()).toMatch(/state=free$/);
    expect(await screen.findByText(reading('22 shown · 22 free'))).toBeInTheDocument();
    await user.click(filter('Any state'));
    expect(address()).toBe('/host/floor');
    await screen.findByRole('button', { name: /^Table T01,/ });
    expect(tableButtons()).toHaveLength(22);
    expect(screen.queryByText(/shown ·/)).not.toBeInTheDocument();
  });

  test('with a filter on, the count cards still count the whole floor', async () => {
    await openApp('/host/floor?section=Window&state=seated', {
      before: async (api) => {
        await join(api, 'Kulkarni', 6);
        await seat(api, 'W001', 'T19');
      },
    });
    expect(await screen.findByText(reading('Total tables', '22'))).toBeInTheDocument();
    expect(filter('Window', true)).toBeInTheDocument();
    expect(screen.getByText(reading('Free tables', '21'))).toBeInTheDocument();
    expect(screen.getByText(reading('Seated', '1'))).toBeInTheDocument();
  });

  test('opening /host/floor?section=Indoor&state=seated presses the same buttons and shows the same tables', async () => {
    await openApp('/host/floor?section=Indoor&state=seated', {
      before: async (api) => {
        await join(api, 'Kulkarni', 6);
        await join(api, 'Shah', 6);
        await seat(api, 'W001', 'T21');
        await seat(api, 'W002', 'T19');
      },
    });
    expect(await screen.findByRole('button', { name: /^Table T21,/ })).toBeInTheDocument();
    expect(tableButtons()).toHaveLength(1);
    expect(filter('Indoor', true)).toBeInTheDocument();
    expect(filter('Seated', true)).toBeInTheDocument();
    expect(filter('All sections', false)).toBeInTheDocument();
  });

  test('with no table matching (Seated on a fresh evening) the floor says "No table matches these filters"', async () => {
    await openApp('/host/floor?state=seated');
    expect(await screen.findByText('No table matches these filters')).toBeInTheDocument();
    expect(screen.getByText('Change the section or the state to see more of the floor.')).toBeInTheDocument();
    expect(tableButtons()).toHaveLength(0);
  });

  test('/host/floor?section=Roof says what to pick instead, with no count cards and no tables', async () => {
    await openApp('/host/floor?section=Roof');
    expect(await screen.findByText('Something in the form is not right')).toBeInTheDocument();
    expect(screen.getByText('Pick a section: Window, Garden or Indoor.')).toBeInTheDocument();
    expect(screen.getByText('Show the whole floor')).toBeInTheDocument();
    expect(screen.queryByText('Total tables')).not.toBeInTheDocument();
    expect(tableButtons()).toHaveLength(0);
  });

  test('a state the floor does not know says "Pick a state: Free, Seated or Uncleared."', async () => {
    await openApp('/host/floor?state=eating');
    expect(await screen.findByText('Something in the form is not right')).toBeInTheDocument();
    expect(screen.getByText('Pick a state: Free, Seated or Uncleared.')).toBeInTheDocument();
    expect(tableButtons()).toHaveLength(0);
  });

  test('"Show the whole floor" opens the floor with no filters', async () => {
    const { address } = await openApp('/host/floor?section=Roof');
    await person().click(await screen.findByText('Show the whole floor'));
    expect(address()).toBe('/host/floor');
    expect(await screen.findByText(reading('Total tables', '22'))).toBeInTheDocument();
    expect(tableButtons()).toHaveLength(22);
  });

  test('typing T07 in the find box and pressing Enter opens T07\'s drawer', async () => {
    await openApp('/host/floor');
    const user = person();
    const box = screen.getByPlaceholderText('Find a table, e.g. T07');
    expect(box).toBe(findBox());
    await user.type(box, 'T07{Enter}');
    expect(screen.getByRole('dialog', { name: /T07/ })).toBeInTheDocument();
    expect(await within(drawer()).findByText('Garden · 2 seats')).toBeInTheDocument();
  });

  test('typing just 7 and pressing Enter opens T07\'s drawer too', async () => {
    await openApp('/host/floor');
    await person().type(findBox(), '7{Enter}');
    expect(screen.getByRole('dialog', { name: /T07/ })).toBeInTheDocument();
    expect(await within(drawer()).findByText('Garden · 2 seats')).toBeInTheDocument();
  });

  test('typing T99 (or 99) opens a drawer saying "No such table" and "Branch Baner has no table T99. Tables run from T01 to T22."', async () => {
    await openApp('/host/floor');
    const user = person();
    await user.type(findBox(), 'T99{Enter}');
    expect(within(drawer()).getByText('T99')).toBeInTheDocument();
    expect(await within(drawer()).findByText('No such table')).toBeInTheDocument();
    expect(within(drawer()).getByText('Branch Baner has no table T99. Tables run from T01 to T22.')).toBeInTheDocument();
    await user.click(within(drawer()).getByRole('button', { name: 'Close' }));
    await user.clear(findBox());
    await user.type(findBox(), '99{Enter}');
    expect(await within(drawer()).findByText('No such table')).toBeInTheDocument();
  });

  test('clicking a table opens its drawer, with the focus on the drawer\'s ✕', async () => {
    await openApp('/host/floor');
    await person().click(await screen.findByRole('button', { name: /^Table T07,/ }));
    expect(screen.getByRole('dialog', { name: /T07/ })).toBeInTheDocument();
    expect(within(drawer()).getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  test('the drawer of a free table reads "Garden · 2 seats", T07, the table drawn and "State" "Free"', async () => {
    await openApp('/host/floor');
    await person().click(await screen.findByRole('button', { name: /^Table T07,/ }));
    const d = drawer();
    expect(await within(d).findByText('Garden · 2 seats')).toBeInTheDocument();
    expect(within(d).getByRole('heading', { name: 'T07' })).toBeInTheDocument();
    expect(within(d).getByText(reading('State', 'Free'))).toBeInTheDocument();
    expect(within(d).queryByText('Party')).not.toBeInTheDocument();
  });

  test('the drawer of a table with a party reads "Party" W001 and "Seated for" 12 min', async () => {
    clockAt(new Date(FRI_1940.getTime() - 12 * MINUTE));
    await openApp('/host/floor', {
      before: async (api) => {
        await join(api, 'Kulkarni', 6);
        await seat(api, 'W001', 'T19');
        jump(12 * MINUTE);
      },
    });
    await person().click(await screen.findByRole('button', { name: /^Table T19,/ }));
    const d = drawer();
    expect(await within(d).findByText(reading('Party', 'W001'))).toBeInTheDocument();
    expect(within(d).getByText(reading('Seated for', '12 min'))).toBeInTheDocument();
    expect(within(d).getByText(reading('State', 'Seated'))).toBeInTheDocument();
  });

  test('the drawer of a table whose party has left reads "State" "Uncleared" and still names the party', async () => {
    await openApp('/host/floor', {
      before: async (api) => {
        await join(api, 'Kulkarni', 6);
        await seat(api, 'W001', 'T19');
        await leave(api, 'T19');
      },
    });
    await person().click(await screen.findByRole('button', { name: /^Table T19,/ }));
    const d = drawer();
    expect(await within(d).findByText(reading('State', 'Uncleared'))).toBeInTheDocument();
    expect(within(d).getByText(reading('Party', 'W001'))).toBeInTheDocument();
  });

  test('✕ (named "Close") closes the drawer, the floor stays as it was, and the focus goes back to the table', async () => {
    const { address } = await openApp('/host/floor?section=Garden');
    const user = person();
    await user.click(await screen.findByRole('button', { name: /^Table T07,/ }));
    await user.click(within(drawer()).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(address()).toBe(`/host/floor${'?section=Garden'}`);
    expect(tableButtons()).toHaveLength(8);
    expect(tableButton('T07')).toHaveFocus();
  });

  test('Esc closes a drawer opened from the find box, the filters stay, and the focus goes back to the find box', async () => {
    const { address } = await openApp('/host/floor?section=Garden&state=free');
    const user = person();
    await screen.findByRole('button', { name: /^Table T07,/ });
    await user.type(findBox(), '7{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(address()).toBe(`/host/floor${'?section=Garden&state=free'}`);
    expect(screen.getByText(reading('8 shown · 8 free'))).toBeInTheDocument();
    expect(findBox()).toHaveFocus();
  });

  test('an open drawer shows a change to its table, and the minutes growing, while it stays open', async () => {
    clockAt(FRI_1940);
    const { api } = await openApp('/host/floor', { before: (a) => join(a, 'Kulkarni', 6) });
    await person().click(await screen.findByRole('button', { name: /^Table T19,/ }));
    const d = drawer();
    expect(await within(d).findByText(reading('State', 'Free'))).toBeInTheDocument();
    await seat(api, 'W001', 'T19');
    await twentySecondsPass();
    expect(within(d).getByText(reading('State', 'Seated'))).toBeInTheDocument();
    expect(within(d).getByText(reading('Seated for', '0 min'))).toBeInTheDocument();
    jump(MINUTE);
    await twentySecondsPass();
    expect(within(d).getByText(reading('Seated for', '1 min'))).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBe(d);
  });

  test('a drawer that has just opened shows "Table" and the number until its table is read', async () => {
    await openApp('/host/floor');
    // a click that the screen answers at once, before anything has been read: the drawer's first moment
    fireEvent.click(await screen.findByRole('button', { name: /^Table T07,/ }));
    const d = drawer();
    expect(within(d).getByText('Table')).toBeInTheDocument();
    expect(within(d).getByText('T07')).toBeInTheDocument();
    expect(within(d).queryByText('Garden · 2 seats')).not.toBeInTheDocument();
    expect(await within(d).findByText('Garden · 2 seats')).toBeInTheDocument();
    expect(within(d).queryByText('Table')).not.toBeInTheDocument();
  });
});
