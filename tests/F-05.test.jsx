import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { openApp } from './app.jsx';
import { person } from './given.js';
import { reading } from './look.js';

const nameBox = () => screen.getByRole('textbox', { name: /Name/ });
const coversBox = () => screen.getByRole('spinbutton', { name: /Covers/ });
const phoneBox = () => screen.getByRole('textbox', { name: /Phone/ });
const add = () => screen.getByRole('button', { name: 'Add to the list' });
const waitlistTab = () => screen.getByRole('link', { name: /^Waitlist/ });

const NAME_HELP = 'One name for the party, as you would call it out.';
const COVERS_HELP = 'How many people. The largest table seats six.';
const PHONE_HELP = 'Kept for calling them back. It never appears in the party’s record.';

async function openForm() {
  const app = await openApp('/host/waitlist');
  return { ...app, user: person() };
}

async function setCovers(user, n) {
  await user.clear(coversBox());
  await user.type(coversBox(), String(n));
}

describe('F-05 · A party joins the list', () => {
  test('the Waitlist tab opens "Kothari\'s · tonight\'s list" over "Waitlist", with the three numbered fields and "Add to the list"', async () => {
    const { address } = await openApp('/host/floor');
    await person().click(waitlistTab());
    expect(address()).toBe('/host/waitlist');
    expect(screen.getByText("Kothari's · tonight's list")).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Waitlist' })).toBeInTheDocument();
    expect(screen.getByText(reading('1', 'Name'))).toBeInTheDocument();
    expect(screen.getByText(reading('2', 'Covers'))).toBeInTheDocument();
    expect(screen.getByText(reading('3', 'Phone', '(optional)'))).toBeInTheDocument();
    expect(nameBox()).toBeInTheDocument();
    expect(coversBox()).toBeInTheDocument();
    expect(phoneBox()).toBeInTheDocument();
    expect(add()).toBeInTheDocument();
  });

  test('a fresh form: Name empty with "Kulkarni" as the example, Covers 2, Phone empty with "+919876543210", and the three help lines', async () => {
    await openForm();
    expect(nameBox()).toHaveValue('');
    expect(screen.getByPlaceholderText('Kulkarni')).toBe(nameBox());
    expect(coversBox()).toHaveValue(2);
    expect(phoneBox()).toHaveValue('');
    expect(screen.getByPlaceholderText('+919876543210')).toBe(phoneBox());
    expect(screen.getByText(NAME_HELP)).toBeInTheDocument();
    expect(screen.getByText(COVERS_HELP)).toBeInTheDocument();
    expect(screen.getByText(PHONE_HELP)).toBeInTheDocument();
  });

  test('beside a fresh form the panel says "Add a party" and what a party gets', async () => {
    await openForm();
    expect(screen.getByText('Add a party')).toBeInTheDocument();
    expect(screen.getByText('They get a number, a place in the queue and the wait the restaurant quotes, stamped when they join.')).toBeInTheDocument();
  });

  test('"One more" and "One fewer" change Covers by one, "One fewer" stops at 0, and a number can be typed', async () => {
    const { user } = await openForm();
    await user.click(screen.getByRole('button', { name: 'One more' }));
    expect(coversBox()).toHaveValue(3);
    const fewer = screen.getByRole('button', { name: 'One fewer' });
    for (let i = 0; i < 5; i += 1) await user.click(fewer);
    expect(coversBox()).toHaveValue(0);
    await setCovers(user, 5);
    expect(coversBox()).toHaveValue(5);
  });

  test('with Name empty, "Add to the list" puts "Type the party’s name first." under Name and in the panel, and adds nobody', async () => {
    const { user } = await openForm();
    await user.click(add());
    expect(screen.getAllByText('Type the party’s name first.')).toHaveLength(2);
    expect(screen.queryByText(NAME_HELP)).not.toBeInTheDocument();
    expect(nameBox()).toBeInvalid();
    expect(coversBox()).not.toBeInvalid();
    expect(screen.getByText('Something in the form is not right')).toBeInTheDocument();
    expect(waitlistTab()).toHaveAccessibleName('Waitlist');
  });

  test('with Name empty and Covers 0, both errors show at once, under their boxes and in the panel', async () => {
    const { user } = await openForm();
    await setCovers(user, 0);
    await user.click(add());
    // under each box its own words; the panel gives both
    expect(screen.getAllByText(/Type the party’s name first\./)).toHaveLength(2);
    expect(screen.getAllByText(/Type how many people: at least one\./)).toHaveLength(2);
    expect(screen.getByText(reading('Type the party’s name first.', 'Type how many people: at least one.'))).toBeInTheDocument();
    expect(screen.queryByText(NAME_HELP)).not.toBeInTheDocument();
    expect(screen.queryByText(COVERS_HELP)).not.toBeInTheDocument();
    expect(nameBox()).toBeInvalid();
    expect(coversBox()).toBeInvalid();
  });

  test('with Covers 7 the panel says "No table here seats that many" and "The largest table seats 6. Suggest splitting the party."', async () => {
    const { user } = await openForm();
    await user.type(nameBox(), 'Kulkarni');
    await setCovers(user, 7);
    await user.click(add());
    expect(await screen.findByText('No table here seats that many')).toBeInTheDocument();
    expect(screen.getByText('The largest table seats 6. Suggest splitting the party.')).toBeInTheDocument();
    expect(nameBox()).not.toBeInvalid();
    expect(coversBox()).not.toBeInvalid();
    expect(screen.getByText(COVERS_HELP)).toBeInTheDocument();
    expect(waitlistTab()).toHaveAccessibleName('Waitlist');
  });

  test('with Covers 20 the panel also says "No table here seats that many"', async () => {
    const { user } = await openForm();
    await user.type(nameBox(), 'Kulkarni');
    await setCovers(user, 20);
    await user.click(add());
    expect(await screen.findByText('No table here seats that many')).toBeInTheDocument();
    expect(coversBox()).not.toBeInvalid();
  });

  test('with Covers 21 it says "That is too many for one party. The largest table seats six." under Covers', async () => {
    const { user } = await openForm();
    await user.type(nameBox(), 'Kulkarni');
    await setCovers(user, 21);
    await user.click(add());
    expect(screen.getAllByText('That is too many for one party. The largest table seats six.').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(COVERS_HELP)).not.toBeInTheDocument();
    expect(coversBox()).toBeInvalid();
  });

  test('with Phone 98765 it says "Type the phone with its country code, like +919876543210." under Phone, and the box is marked', async () => {
    const { user } = await openForm();
    await user.type(nameBox(), 'Kulkarni');
    await user.type(phoneBox(), '98765');
    expect(phoneBox()).not.toBeInvalid();
    await user.click(add());
    expect(screen.getAllByText('Type the phone with its country code, like +919876543210.')).toHaveLength(2);
    expect(screen.queryByText(PHONE_HELP)).not.toBeInTheDocument();
    expect(phoneBox()).toBeInvalid();
  });

  test('with a name of 61 letters it says "Keep the name to 60 letters or fewer." under Name', async () => {
    const { user } = await openForm();
    await user.type(nameBox(), 'K'.repeat(61));
    await user.click(add());
    expect(screen.getAllByText('Keep the name to 60 letters or fewer.')).toHaveLength(2);
    expect(nameBox()).toBeInvalid();
  });

  test('typing in a box takes the errors and the panel\'s message away, and the help lines come back', async () => {
    const { user } = await openForm();
    await setCovers(user, 0);
    await user.click(add());
    expect(screen.getByText('Type how many people: at least one.')).toBeInTheDocument();
    await user.type(phoneBox(), '+');
    expect(screen.queryByText('Type the party’s name first.')).not.toBeInTheDocument();
    expect(screen.queryByText('Type how many people: at least one.')).not.toBeInTheDocument();
    expect(screen.queryByText('Something in the form is not right')).not.toBeInTheDocument();
    expect(screen.getByText(NAME_HELP)).toBeInTheDocument();
    expect(screen.getByText(COVERS_HELP)).toBeInTheDocument();
    expect(nameBox()).not.toBeInvalid();
  });

  test('pressing "One more" also takes the errors away', async () => {
    const { user } = await openForm();
    await user.click(add());
    expect(screen.getAllByText('Type the party’s name first.')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'One more' }));
    expect(screen.queryByText('Type the party’s name first.')).not.toBeInTheDocument();
    expect(screen.getByText(NAME_HELP)).toBeInTheDocument();
    expect(screen.getByText('Add a party')).toBeInTheDocument();
  });

  test('a good party is added with "Add to the list": Name and Phone empty, and the Waitlist badge counts one more', async () => {
    const { user } = await openForm();
    await user.type(nameBox(), 'Kulkarni');
    await setCovers(user, 6);
    await user.type(phoneBox(), '+919876543210');
    await user.click(add());
    expect(await within(waitlistTab()).findByText('1')).toBeInTheDocument();
    expect(nameBox()).toHaveValue('');
    expect(phoneBox()).toHaveValue('');
  });

  test('Enter in a box adds the party too, with an empty phone', async () => {
    const { user } = await openForm();
    await user.type(nameBox(), 'Kulkarni');
    await setCovers(user, 1);
    await user.type(coversBox(), '{Enter}');
    expect(await within(waitlistTab()).findByText('1')).toBeInTheDocument();
    expect(nameBox()).toHaveValue('');
  });

  test('a refused party leaves no trace anywhere in the app', async () => {
    const { user } = await openForm();
    await user.type(nameBox(), 'Kulkarni');
    await setCovers(user, 7);
    await user.click(add());
    expect(await screen.findByText('No table here seats that many')).toBeInTheDocument();
    expect(waitlistTab()).toHaveAccessibleName('Waitlist');
    await user.click(screen.getByRole('button', { name: /Meera/ }));
    await user.hover(within(screen.getByRole('menu')).getByRole('menuitem', { name: /Guest/ }));
    expect(screen.getByText('Nobody is on the list yet. Add a party as Meera, the host.')).toBeInTheDocument();
  });
});
