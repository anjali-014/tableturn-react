// The people in TableTurn's stories. Each one sees their own screens.
export const PERSONAS = [
  {
    id: 'host', name: 'Meera', role: 'Host', color: '#0f766e',
    blurb: 'Runs the host stand. Sees every table, keeps the waitlist and seats each party.',
    nav: [
      { to: '/host/floor', label: 'The floor', icon: 'grid' },
      { to: '/host/waitlist', label: 'Waitlist', icon: 'list' },
    ],
  },
  {
    id: 'staff', name: 'Joseph', role: 'Floor staff', color: '#b45309',
    blurb: 'Works the floor. Marks a table when the party leaves, and again once it is wiped.',
    nav: [{ to: '/staff', label: 'Tables', icon: 'grid' }],
  },
  {
    id: 'guest', name: 'A guest', role: 'Guest', color: '#4c51bf',
    blurb: 'Gives a name at the stand. Sees the wait they were quoted and, once seated, the wait they had.',
    nav: [{ to: '/guest', label: 'My wait', icon: 'clock' }],
  },
  {
    id: 'manager', name: 'Ravi', role: 'Manager', color: '#be123c',
    blurb: 'Owns the restaurant. Reads every party’s record.',
        nav: [{ to: '/manager/board', label: 'The board', icon: 'book' }],
  },
];

/** The persona whose screens the path belongs to, e.g. '/host/floor' → Meera. */
export function personaForPath(pathname) {
  const first = pathname.split('/')[1];
  const byRoute = { host: 'host', staff: 'staff', guest: 'guest', manager: 'manager' };
  return PERSONAS.find((p) => p.id === byRoute[first]) ?? null;
}
