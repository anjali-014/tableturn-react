import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { FRI_1940, MINUTE, clockAt, jump, join, person, seat, twentySecondsPass, wait } from './given.js';
import { reading, wordsOf } from './look.js';

const nameBox = () => screen.getByRole('textbox', { name: /Name/ });
const coversBox = () => screen.getByRole('spinbutton', { name: /Covers/ });
const slip = () => screen.getByRole('button', { name: /W001.*Kulkarni party/ });
const step = (words) => screen.getAllByRole('listitem').find((li) => wordsOf(li).endsWith(words));
const onTheList = () => screen.getByRole('region', { name: /^On the list now/ });

/** Meera adds a party through the form at 19:40. */
async function addKulkarni() {
  clockAt(FRI_1940);
  const app = await openApp('/host/waitlist');
  const user = person();
  await user.type(nameBox(), 'Kulkarni');
  await user.clear(coversBox());
  await user.type(coversBox(), '6');
  await user.click(screen.getByRole('button', { name: 'Add to the list' }));
  await screen.findByText(reading('Hand W001 to the Kulkarni party'));
  return { ...app, user };
}

/** The slip is handed over by a tap, and the party takes its place. */
async function handOverByTap(user) {
  await user.click(slip());
  await wait(1500);
  await screen.findByRole('button', { name: 'OK, next party' });
}

afterEach(() => vi.useRealTimers());

describe('F-06 · Handing over the number', () => {
  test('after Kulkarni (6) is added, the panel shows step 1, the party over "Kulkarni party", and the slip "Kothari\'s", "W001", "6 covers · about 40 min"', async () => {
    await addKulkarni();
    expect(step('Hand them their number')).toHaveTextContent(/^1\s*Hand them their number$/);
    expect(step('In the queue')).toHaveTextContent(/^2\s*In the queue$/);
    expect(screen.getByText('Kulkarni party')).toBeInTheDocument();
    const paper = slip();
    expect(within(paper).getByText("Kothari's")).toBeInTheDocument();
    expect(within(paper).getByText('W001')).toBeInTheDocument();
    expect(within(paper).getByText('6 covers · about 40 min')).toBeInTheDocument();
    expect(screen.getByText(reading('Hand', 'W001', 'to the Kulkarni party'))).toBeInTheDocument();
    expect(screen.getByText('Drag the ticket to them, or tap it.')).toBeInTheDocument();
  });

  test('while the slip waits to be handed over, the form is locked', async () => {
    await addKulkarni();
    expect(nameBox()).toBeDisabled();
    expect(coversBox()).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /Phone/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add to the list' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'One more' })).toBeDisabled();
  });

  test('dragging the slip onto the party hands it over: step 1 is ticked, "Taking their place…" shows, then step 2 is ticked', async () => {
    await addKulkarni();
    const dataTransfer = { setData: () => {}, getData: () => 'W001', effectAllowed: '', dropEffect: '' };
    const party = screen.getByText('Kulkarni party');
    fireEvent.dragStart(slip(), { dataTransfer });
    fireEvent.dragEnter(party, { dataTransfer });
    fireEvent.dragOver(party, { dataTransfer });
    fireEvent.drop(party, { dataTransfer });
    expect(await screen.findByText('Taking their place…')).toBeInTheDocument();
    expect(step('Hand them their number')).toHaveTextContent(/^Hand them their number$/);
    expect(screen.queryByRole('button', { name: /W001.*Kulkarni party/ })).not.toBeInTheDocument();
    await wait(1500);
    expect(step('In the queue')).toHaveTextContent(/^In the queue$/);
    expect(screen.queryByText('Taking their place…')).not.toBeInTheDocument();
  });

  test('tapping the slip hands it over just as the drag does', async () => {
    const { user } = await addKulkarni();
    await user.click(slip());
    expect(screen.getByText('Taking their place…')).toBeInTheDocument();
    expect(step('Hand them their number')).toHaveTextContent(/^Hand them their number$/);
    await wait(1500);
    expect(step('In the queue')).toHaveTextContent(/^In the queue$/);
    expect(screen.getByText('Kulkarni party is number 1 in the queue')).toBeInTheDocument();
  });

  test('Tab reaches the slip, and Enter hands it over', async () => {
    const { user } = await addKulkarni();
    for (let i = 0; i < 20 && document.activeElement !== slip(); i += 1) await user.tab();
    expect(slip()).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Taking their place…')).toBeInTheDocument();
  });

  test('once handed over, the queue strip shows each waiting party\'s place and number, with "Kulkarni party is number 1 in the queue" and "Joined at 19:40, quoted about 40 min."', async () => {
    const { user } = await addKulkarni();
    await handOverByTap(user);
    const strip = screen.getByRole('list', { name: 'The queue, first in line on the left' });
    const places = within(strip).getAllByRole('listitem');
    expect(places).toHaveLength(1);
    expect(within(places[0]).getByText('1')).toBeInTheDocument();
    expect(within(places[0]).getByText('W001')).toBeInTheDocument();
    expect(screen.getByText('Kulkarni party is number 1 in the queue')).toBeInTheDocument();
    expect(screen.getByText(/^Joined at 19:40, quoted about 40 min\./)).toBeInTheDocument();
  });

  test('a second party\'s strip puts the first in line on the left and the new party after it', async () => {
    clockAt(FRI_1940);
    await openApp('/host/waitlist', { before: (api) => join(api, 'Kulkarni', 6) });
    const user = person();
    await user.type(nameBox(), 'Shah');
    await user.click(screen.getByRole('button', { name: 'Add to the list' }));
    await user.click(await screen.findByRole('button', { name: /W002.*Shah party/ }));
    await wait(1500);
    const places = within(screen.getByRole('list', { name: 'The queue, first in line on the left' })).getAllByRole('listitem');
    expect(places.map(wordsOf)).toEqual(['1 W001', '2 W002']);
    expect(screen.getByText('Shah party is number 2 in the queue')).toBeInTheDocument();
  });

  test('"OK, next party" has the focus; pressing it brings back "Add a party", unlocks the form and sets Covers to 2', async () => {
    const { user } = await addKulkarni();
    await handOverByTap(user);
    expect(screen.getByRole('button', { name: 'OK, next party' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Add a party')).toBeInTheDocument();
    expect(nameBox()).toBeEnabled();
    expect(coversBox()).toHaveValue(2);
    expect(screen.queryByRole('button', { name: 'OK, next party' })).not.toBeInTheDocument();
  });

  test('with nobody waiting, "On the list now" shows 0 with "Nobody is waiting"', async () => {
    await openApp('/host/waitlist');
    expect(await within(onTheList()).findByText('Nobody is waiting')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^On the list now/ })).toHaveTextContent(/^On the list now\s*0$/);
    expect(within(onTheList()).getByText('Add a party above. Seat them from a table on the floor.')).toBeInTheDocument();
    expect(within(onTheList()).queryByRole('table')).not.toBeInTheDocument();
  });

  test('with parties waiting, "On the list now" counts them and lists them in place order: 1, W001, Kulkarni, 6, 19:40, 40 min, 3 min', async () => {
    clockAt(FRI_1940);
    await openApp('/host/waitlist', {
      before: async (api) => {
        await join(api, 'Kulkarni', 6);
        jump(MINUTE);
        await join(api, 'Shah', 2);
        jump(2 * MINUTE);
      },
    });
    const table = await within(onTheList()).findByRole('table');
    expect(screen.getByRole('heading', { name: /^On the list now/ })).toHaveTextContent(/^On the list now\s*2$/);
    const headers = within(table).getAllByRole('columnheader').map(wordsOf).filter(Boolean);
    expect(headers).toEqual(['Place', 'Party', 'Name', 'Covers', 'Joined', 'Quoted', 'Waiting']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getAllByRole('cell').map(wordsOf).slice(0, 7)).toEqual(['1', 'W001', 'Kulkarni', '6', '19:40', '40 min', '3 min']);
    expect(within(rows[1]).getAllByRole('cell').map(wordsOf).slice(0, 7)).toEqual(['2', 'W002', 'Shah', '2', '19:41', '40 min', '2 min']);
  });

  test('each "Waiting" figure grows on its own every 20 seconds', async () => {
    clockAt(FRI_1940);
    await openApp('/host/waitlist', {
      before: async (api) => {
        await join(api, 'Kulkarni', 6);
        jump(3 * MINUTE - 10 * 1000);
      },
    });
    const table = await within(onTheList()).findByRole('table');
    const row = () => within(table).getAllByRole('row')[1];
    expect(within(row()).getAllByRole('cell')[6]).toHaveTextContent(/^2 min$/);
    await twentySecondsPass();
    expect(within(row()).getAllByRole('cell')[6]).toHaveTextContent(/^3 min$/);
  });

  test('a party seated from another screen leaves "On the list now" and the count drops by one', async () => {
    clockAt(FRI_1940);
    const { api } = await openApp('/host/waitlist', {
      before: async (a) => {
        await join(a, 'Kulkarni', 6);
        await join(a, 'Shah', 2);
      },
    });
    const table = await within(onTheList()).findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    await seat(api, 'W001', 'T19');
    await twentySecondsPass();
    expect(screen.getByRole('heading', { name: /^On the list now/ })).toHaveTextContent(/^On the list now\s*1$/);
    const rows = within(onTheList()).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('W002')).toBeInTheDocument();
  });

  test('before the list is read, "On the list now" shows but neither the table nor "Nobody is waiting" does', async () => {
    await openApp('/host/waitlist', { before: (api) => join(api, 'Kulkarni', 6) });
    expect(screen.getByRole('heading', { name: /^On the list now/ })).toBeInTheDocument();
    expect(within(onTheList()).queryByRole('table')).not.toBeInTheDocument();
    expect(within(onTheList()).queryByText('Nobody is waiting')).not.toBeInTheDocument();
    expect(await within(onTheList()).findByRole('table')).toBeInTheDocument();
  });
});
