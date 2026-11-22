
import { useEffect, useRef, useState } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import Icon from '../../components/Icon.jsx';
import Problem from '../../components/Problem.jsx';
import SectionTabs from '../../components/SectionTabs.jsx';
import TableTop from '../../components/TableTop.jsx';

import { BRANCH, SECTIONS, STATES } from '../../data/restaurant.js';
import { useGet } from '../../state/AppContext.jsx';


function Segmented({ label, options, value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button
          key={id || 'all'}
          type="button"
          aria-pressed={value === id}
          className={`seg${value === id ? ' is-on' : ''}`}
          onClick={() => onChange(id)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}


function TableDrawer({ no, onClose }) {
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

  // Escape closes the drawer.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
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
          </>
        )}
      </aside>
    </div>
  );
}


export default function Floor() {
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

  return (
    <div className="page is-fit">

      <div className="page-head">
        <div>
          <p className="eyebrow">
            {BRANCH.name} · {BRANCH.code}
          </p>

          <h1 className="page-title">The floor</h1>
        </div>

        <SectionTabs personaId="host" />
      </div>


      {/* Count cards appear only when the filtered request is valid. */}
      {answer?.status === 200 && everything?.status === 200 && (
        <div className="stats" style={{ '--stat-cols': 4 }}>

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
            to="/host/floor"
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
        <TableDrawer
          no={selected}
          onClose={() => setSelected(null)}
        />
      )}

    </div>
  );
}
