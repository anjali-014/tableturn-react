// The people in TableTurn's stories. Each one sees their own screens.
export const PERSONAS = [
  {
    id: 'host', name: 'Meera', role: 'Host', color: '#0f766e',
    blurb: 'Runs the host stand. Sees every table, keeps the waitlist and seats each party.',
    nav: [{ to: '/host/floor' }],
  },
  {
    id: 'staff', name: 'Joseph', role: 'Floor staff', color: '#b45309',
    blurb: 'Works the floor. Marks a table when the party leaves, and again once it is wiped.',
    nav: [{ to: '/staff' }],
  },
  {
    id: 'guest', name: 'A guest', role: 'Guest', color: '#4c51bf',
    blurb: 'Gives a name at the stand. Sees the wait they were quoted and, once seated, the wait they had.',
    nav: [{ to: '/guest' }],
  },
  {
    id: 'manager', name: 'Ravi', role: 'Manager', color: '#be123c',
    blurb: 'Owns the restaurant. Reads every party’s record.',
    nav: [{ to: '/manager/board' }],
  },
];
