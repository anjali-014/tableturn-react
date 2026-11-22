import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

// What every screen shares. Screens read their data with useGet() and change it with post(), through api.js,
// exactly as they would ask a real server. After every change the screens ask again, as a real frontend refetches
// after a POST, and every 20 seconds too, so the minutes a party has sat grow on their own.
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [tick, setTick] = useState(0);
  // Bumped by every change, so the screens read their data again.
  const [dataVersion, setDataVersion] = useState(0);
  // The party the guest is viewing the app as (none until one is picked).
  const [guestParty, setGuestParty] = useState(null);

  // Time passes while the page is open, so seated minutes grow on their own.
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 20_000);
    return () => clearInterval(timer);
  }, []);

  /** A request that changes the data, such as a party joining the list. */
  async function post(path, body) {
    const answer = await api.post(path, body);
    if (answer.status < 300) setDataVersion((v) => v + 1);
    return answer;
  }

  const value = { tick, dataVersion, guestParty, setGuestParty, post };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}

/** A GET whose answer a screen shows: null until it arrives, asked again after every change and every 20 seconds. */
export function useGet(path) {
  const { tick, dataVersion } = useApp();
  const [answer, setAnswer] = useState(null);
  useEffect(() => {
    let current = true;
    api.get(path).then((a) => { if (current) setAnswer(a); });
    return () => { current = false; };
  }, [path, tick, dataVersion]);
  return answer;
}

/** Tonight's parties, newest first, as the list names them: { partyId, name, covers, state }. Null until it arrives. */
export function usePartyList() {
  const answer = useGet('/parties');
  return answer?.status === 200 ? answer.body.parties : null;
}
