import { createContext, useEffect, useState } from 'react';
import { api } from '../api.js';

// What every screen shares. Screens read their data with useGet(), through api.js, exactly as they would ask a
//   real server.
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const value = {};
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** A GET whose answer a screen shows: null until it arrives. */
export function useGet(path) {
  const [answer, setAnswer] = useState(null);
  useEffect(() => {
    let current = true;
    api.get(path).then((a) => { if (current) setAnswer(a); });
    return () => { current = false; };
  }, [path]);
  return answer;
}
