import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Dropdown from '../../components/Dropdown.jsx';
import Icon from '../../components/Icon.jsx';
import Problem from '../../components/Problem.jsx';
import SectionTabs from '../../components/SectionTabs.jsx';
import TableTop from '../../components/TableTop.jsx';
import { formatTime } from '../../data/format.js';
import { explain } from '../../data/messages.js';
import { BRANCH, SECTIONS, STATES } from '../../data/restaurant.js';
import { useApp, useGet, usePartyList } from '../../state/AppContext.jsx';

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button key={id || 'all'} type="button" aria-pressed={value === id}
          className={`seg${value === id ? ' is-on' : ''}`} onClick={() => onChange(id)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** What an action answered, in the person's words. `facts` names what was acted on, for a refusal's words. */
function Outcome({ answer, facts, ok }) {
  if (!answer) return null;
  if (answer.status < 300) return <p className="drawer-result is-ok"><Icon name="check" size={16} strokeWidth={2.4} /> {ok(answer.body)}</p>;
  const { title, text } = explain(answer, facts);
  return <div className="drawer-result is-no"><Icon name="alert" size={16} /><div><strong>{title}</strong><p>{text}</p></div></div>;
}

/** The host seats a party here: every party can be picked, so each refusal can be reached. */
function SeatForm({ table }) {
  const { post } = useApp();
  const list = usePartyList();
  const [picked, setPicked] = useState(null);
  const [answer, setAnswer] = useState(null);

  if (!list) return null;
  const parties = [...list].sort((a, b) => (a.state === 'waiting' ? 0 : 1) - (b.state === 'waiting' ? 0 : 1));
  // the first waiting party in line, until another is picked (the list is newest first, so it is the last one waiting)
  const party = picked ?? parties.filter((p) => p.state === 'waiting').at(-1)?.partyId ?? parties[0]?.partyId ?? '';
  if (parties.length === 0) {
    return <p className="drawer-empty">Nobody is on the list yet. <Link to="/host/waitlist">Add a party to the waitlist</Link> to seat them here.</p>;
  }
  async function seat(e) {
    e.preventDefault();
    setPicked(party);
    setAnswer(await post('/seatings', { partyId: party, table: table.no }));
  }
  return (
    <form className="drawer-form" onSubmit={seat}>
      <label className="field-label" htmlFor="seat-party">Seat a party at {table.no}</label>
      <div className="drawer-form-row">
        <Dropdown id="seat-party" label="Party to seat" value={party} onChange={(v) => { setPicked(v); setAnswer(null); }}
          options={parties.map((p) => ({ value: p.partyId, label: `${p.partyId} · ${p.name}`, note: `${p.covers} ${p.covers === 1 ? 'cover' : 'covers'} · ${p.state}` }))} />
        <button type="submit" className="btn btn-primary">Seat</button>
      </div>
      <Outcome answer={answer} facts={{ partyId: party, table: table.no, seats: table.seats, covers: parties.find((p) => p.partyId === party)?.covers }}
        ok={(b) => `${b.partyId} seated at ${b.table} after waiting ${b.waitedMinutes} min.`} />
    </form>
  );
}

/** Joseph marks the table: Leave when the party goes, Clear once it is wiped. A second press is refused. */
function StaffActions({ table }) {
  const { post } = useApp();
  const onTable = useGet(`/branches/${BRANCH.code}/tables/${table.no}/seating`);
  const current = onTable?.status === 200 ? onTable.body.seatingId : null;
  // the seating this drawer has acted on: once the table is cleared it has none, and a second press is still refused
  const [seating, setSeating] = useState(null);
  const [answer, setAnswer] = useState(null);
  const acting = current ?? seating;

  if (!onTable) return null;
  if (!acting) return <p className="drawer-empty">Free. Nothing to mark here until a party is seated.</p>;
  async function act(kind) {
    setSeating(acting);
    setAnswer({ kind, ...(await post(`/seatings/${acting}/${kind}`)) });
  }
  return (
    <div className="drawer-form">
      <p className="field-label">Seating {acting}</p>
      <div className="drawer-form-row">
        <button type="button" className="btn btn-primary" onClick={() => act('leave')}><Icon name="door" size={16} /> Leave</button>
        <button type="button" className="btn btn-soft" onClick={() => act('clear')}><Icon name="sparkle" size={16} /> Clear</button>
      </div>
      <Outcome answer={answer} facts={{ seatingId: acting }} ok={(b) => (answer.kind === 'leave'
        ? `The party left at ${formatTime(Date.parse(b.leftAt))}. The table needs clearing now.`
        : `${b.table} is free. The party had it for ${b.turnMinutes} min.`)} />
    </div>
  );
}



function TableDrawer({ no, mode, onClose }) {
  const answer = useGet(
    `/branches/${BRANCH.code}/tables/${encodeURIComponent(no)}`
  );

  const closeRef = useRef(null);
  const table = answer?.status === 200 ? answer.body : null;

  // Move focus to the close button when the drawer opens,
  // then restore focus to the element that opened it.
  useEffect(() => {
    const before = document.activeElement;

    closeRef.current?.focus({ preventScroll: true });

    return () => before?.focus?.({ preventScroll: true });
  }, []);

  // Esc closes the drawer; an Esc that already closed the drop-down inside it is left at that.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={onClose}
      role="presentation"
    >
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Table ${no}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="drawer-head">
          <div>
            <p className="eyebrow">
              {table
                ? `${table.section} · ${table.seats} seats`
                : 'Table'}
            </p>

            <h2 className="drawer-title">{no}</h2>
          </div>

          <button
            ref={closeRef}
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" />
          </button>
        </header>

        {!answer && (
          <p>Loading table details...</p>
        )}

        {answer && !table && (
          <Problem answer={answer} facts={{ table: no }} />
        )}

        {table && (
          <>
            <div className="drawer-table">
              <TableTop table={table} />
            </div>

            <dl className="facts">
              <div>
                <dt>State</dt>

                <dd className={`state-word is-${table.state}`}>
                  {STATES.find((s) => s.id === table.state)?.name}
                </dd>
              </div>

              {table.partyId && (
                <div>
                  <dt>Party</dt>
                  <dd className="mono">{table.partyId}</dd>
                </div>
              )}

              {table.state === 'seated' && (
                <div>
                  <dt>Seated for</dt>
                  <dd className="mono">
                    {table.seatedMinutes} min
                  </dd>
                </div>
              )}
            </dl>
           {mode === 'host' ? <SeatForm table={table} /> : <StaffActions table={table} />}
          </>
        )}
      </aside>
    </div>
  );
}

export default function Floor({ mode }) {
  const [params, setParams] = useSearchParams();

  const [selected, setSelected] = useState(null);
  const [findText, setFindText] = useState('');

  const section = params.get('section') ?? '';
  const state = params.get('state') ?? '';

  const query = new URLSearchParams();

  if (section) query.set('section', section);
  if (state) query.set('state', state);

  const base = `/branches/${BRANCH.code}/tables`;

  const answer = useGet(
    `${base}${query.toString() ? `?${query}` : ''}`
  );

  const everything = useGet(base);

  const all =
    everything?.status === 200
      ? everything.body.tables
      : [];

  const shown =
    answer?.status === 200
      ? answer.body.tables
      : [];

  const seated = all.filter(
    (t) => t.state === 'seated'
  );

  const longest = seated.reduce(
    (max, t) => Math.max(max, t.seatedMinutes ?? 0),
    0
  );

  function setFilter(name, value) {
    const next = new URLSearchParams(params);

    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }

    setParams(next);
  }

  // A number such as 7 becomes T07; T07 remains T07.
  function find(e) {
    e.preventDefault();

    const text = findText.trim();

    if (!text) return;

    const no = /^\d+$/.test(text)
      ? `T${text.padStart(2, '0')}`
      : text.toUpperCase();

    setSelected(no);
  }
const host = mode === 'host';

    return (
    <div className="page is-fit">

      <div className="page-head">
        <div>
          <p className="eyebrow">{host ? `${BRANCH.name} · ${BRANCH.code}` : "Joseph's section of the floor"}</p>
          <h1 className="page-title">{host ? 'The floor' : 'Tables'}</h1>
        </div>

        {host && <SectionTabs personaId="host" />}
      </div>


      {/* Count cards appear only when the filtered request is valid. */}
      {answer?.status === 200 && everything?.status === 200 && (
        <div className="stats" style={{ '--stat-cols': 5 }}>

          <div className="stat">
            <span className="stat-label">Total tables</span>

            <strong className="stat-value">
              {all.length}
            </strong>

            <span className="stat-note">
              10 twos · 8 fours · 4 sixes
            </span>
          </div>


          <div className="stat">
            <span className="stat-label">Free tables</span>

            <strong className="stat-value is-free">
              {all.filter((t) => t.state === 'free').length}
            </strong>

            <span className="stat-note">
              ready for a party
            </span>
          </div>


          <div className="stat">
            <span className="stat-label">Seated</span>

            <strong className="stat-value">
              {seated.length}
            </strong>

            <span className="stat-note">
              {seated.length
                ? 'parties eating'
                : 'nobody seated yet'}
            </span>
          </div>


          <div className="stat">
            <span className="stat-label">Longest sitting</span>

            <strong className="stat-value mono">
              {seated.length ? `${longest} min` : '—'}
            </strong>

            <span className="stat-note">
              since seated
            </span>
          </div>


          <div className={`stat${all.some((t) => t.state === 'uncleared') ? ' is-alert' : ''}`}>
            <span className="stat-label">To clear</span>

            <strong className="stat-value">
              {all.filter((t) => t.state === 'uncleared').length}
            </strong>

            <span className="stat-note">
              left, not yet wiped
            </span>
          </div>

        </div>
      )}


      <div className="toolbar">

        <Segmented
          label="Section"
          value={section}
          onChange={(v) => setFilter('section', v)}
          options={[
            ['', 'All sections'],
            ...SECTIONS.map((s) => [s, s])
          ]}
        />


        <Segmented
          label="State"
          value={state}
          onChange={(v) => setFilter('state', v)}
          options={[
            ['', 'Any state'],
            ...STATES.map((s) => [s.id, s.name])
          ]}
        />


        {(section || state) && answer?.status === 200 && (
          <p className="filter-count" aria-live="polite">
            <strong>{shown.length}</strong> shown ·{' '}
            <strong className="is-free">
              {answer.body.free}
            </strong>{' '}
            free
          </p>
        )}


        <form className="search find-door" onSubmit={find}>
          <Icon name="search" size={16} />

          <input
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="Find a table, e.g. T07"
            aria-label="Table number"
          />
        </form>

      </div>


      {/* Error, empty state, or floor tables. */}
      {!answer ? null : answer.status !== 200 ? (

        <Problem answer={answer}>
          <Link
            to={host ? '/host/floor' : '/staff'}
            className="btn btn-soft problem-action"
          >
            Show the whole floor
          </Link>
        </Problem>

      ) : shown.length === 0 ? (

        <div className="empty">
          <Icon name="grid" size={28} />

          <p className="empty-title">
            No table matches these filters
          </p>

          <p className="empty-text">
            Change the section or the state to see more of the floor.
          </p>
        </div>

      ) : (

        <div className="floor">

          {SECTIONS.map((s) => {
            const tables = shown.filter(
              (t) => t.section === s
            );

            if (tables.length === 0) return null;

            return (
              <section
                key={s}
                className="floor-section"
                aria-label={`${s} tables`}
              >

                <header className="floor-section-head">
                  <span>{s}</span>

                  <span className="mono">
                    {tables.filter((t) => t.state === 'free').length}/{tables.length} free
                  </span>
                </header>


                {[2, 4, 6].map((seats) => {
                  const row = tables.filter(
                    (t) => t.seats === seats
                  );

                  if (row.length === 0) return null;

                  return (
                    <div key={seats} className="floor-row">

                      {row.map((t, i) => (
                        <TableTop
                          key={t.no}
                          table={t}
                          selected={t.no === selected}
                          onClick={() => setSelected(t.no)}
                          style={{ '--i': i }}
                        />
                      ))}

                    </div>
                  );
                })}

              </section>
            );
          })}

        </div>
      )}


      <ul className="legend legend-below" aria-label="Legend">
        <li>
          <span className="dot is-free" /> Free
        </li>

        <li>
          <span className="dot is-seated" /> Seated
        </li>

        <li>
          <span className="dot is-uncleared" /> Left, to be cleared
        </li>
      </ul>


      {selected && (
       <TableDrawer no={selected} mode={mode} onClose={() => setSelected(null)} />
      )}

    </div>
  );
}
