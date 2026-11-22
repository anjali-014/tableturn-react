// Opens the whole app at one address, on a fresh evening, the way a person would land on it.
// Every call starts from the starting data again: the app's modules are loaded anew, so nothing a previous test did
// is still on the floor or the list. `before(api)` can put the restaurant into a state first (parties joining,
// seatings, leaves, clears), through the same api the screens use. `address()` reads the address bar: the path and
// the ?query the app is on right now.
import { render, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { vi } from 'vitest';

function AddressBar({ onChange }) {
  const location = useLocation();
  onChange(location.pathname + location.search);
  return null;
}

export async function openApp(path = '/', { before } = {}) {
  vi.resetModules();
  const { api } = await import('../src/api.js');
  if (before) await before(api);
  const { default: App } = await import('../src/App.jsx');
  const { AppProvider } = await import('../src/state/AppContext.jsx');
  let current = path;
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <AddressBar onChange={(where) => { current = where; }} />
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>,
  );
  // `on` holds queries that look at this screen only, for a test with a second screen beside it
  return { ...view, on: within(view.container), api, address: () => current };
}

/**
 * Opens a second screen of the same restaurant beside the first, as a second tablet would: the same backend, its
 * own address and its own screens. Call it after openApp. Its queries (getByRole, findByText, ...) look only at that
 * screen, as the `on` queries returned by openApp look only at the first.
 */
export async function openAnotherScreen(path) {
  const { default: App } = await import('../src/App.jsx');
  const { AppProvider } = await import('../src/state/AppContext.jsx');
  let current = path;
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <AddressBar onChange={(where) => { current = where; }} />
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>,
  );
  return { ...within(view.container), address: () => current };
}
