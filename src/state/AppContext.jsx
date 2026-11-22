import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

// What every screen shares. Screens read their data with useGet(), through api.js, exactly as they would ask a
//   real server. They ask again every 20 seconds, so what they show stays current.
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [tick, setTick] = useState(0);
  // The party the guest is viewing the app as (none until one is picked).
  const [guestParty, setGuestParty] = useState(null);

  // Time passes while the page is open: every 20 seconds the screens read their data again.
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 20_000);
    return () => clearInterval(timer);
  }, []);

  const value = { tick, guestParty, setGuestParty };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}

/** A GET whose answer a screen shows: null until it arrives, asked again every 20 seconds. */
export function useGet(path) {
  const { tick } = useApp();
  const [answer, setAnswer] = useState(null);
  useEffect(() => {
    let current = true;
    api.get(path).then((a) => { if (current) setAnswer(a); });
    return () => { current = false; };
  }, [path, tick]);
  return answer;
}

/** Tonight's parties, newest first, as the list names them: { partyId, name, covers, state }. Null until it arrives. */
export function usePartyList() {
  const answer = useGet('/parties');
  return answer?.status === 200 ? answer.body.parties : null;
}
