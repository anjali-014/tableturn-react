import SectionTabs from '../../components/SectionTabs.jsx';
import TableTop from '../../components/TableTop.jsx';
import { BRANCH, SECTIONS } from '../../data/restaurant.js';
import { useGet } from '../../state/AppContext.jsx';

/** The floor: GET /branches/Baner/tables, every table in its section, laid out as the room is. */
export default function Floor() {
  const answer = useGet(`/branches/${BRANCH.code}/tables`);
  const all = answer?.status === 200 ? answer.body.tables : [];
  const seated = all.filter((t) => t.state === 'seated');
  const longest = seated.reduce((max, t) => Math.max(max, t.seatedMinutes ?? 0), 0);

  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">{BRANCH.name} · {BRANCH.code}</p>
          <h1 className="page-title">The floor</h1>
        </div>
        <SectionTabs personaId="host" />
      </div>

      {answer?.status === 200 && (
        <>
          <div className="stats" style={{ '--stat-cols': 4 }}>
            <div className="stat"><span className="stat-label">Total tables</span><strong className="stat-value">{all.length}</strong><span className="stat-note">10 twos · 8 fours · 4 sixes</span></div>
            <div className="stat"><span className="stat-label">Free tables</span><strong className="stat-value is-free">{all.filter((t) => t.state === 'free').length}</strong><span className="stat-note">ready for a party</span></div>
            <div className="stat"><span className="stat-label">Seated</span><strong className="stat-value">{seated.length}</strong><span className="stat-note">{seated.length ? 'parties eating' : 'nobody seated yet'}</span></div>
            <div className="stat"><span className="stat-label">Longest sitting</span><strong className="stat-value mono">{seated.length ? `${longest} min` : '—'}</strong><span className="stat-note">since seated</span></div>
          </div>

          <div className="floor">
            {SECTIONS.map((s) => {
              const tables = all.filter((t) => t.section === s);
              return (
                <section key={s} className="floor-section" aria-label={`${s} tables`}>
                  <header className="floor-section-head">
                    <span>{s}</span>
                    <span className="mono">{tables.filter((t) => t.state === 'free').length}/{tables.length} free</span>
                  </header>
                  {/* laid out like the room: a row of two-tops, a row of four-tops, a row of six-tops */}
                  {[2, 4, 6].map((seats) => {
                    const row = tables.filter((t) => t.seats === seats);
                    if (row.length === 0) return null;
                    return (
                      <div key={seats} className="floor-row">
                        {row.map((t, i) => (
                          <TableTop key={t.no} table={t} style={{ '--i': i }} />
                        ))}
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </>
      )}

      <ul className="legend legend-below" aria-label="Legend">
        <li><span className="dot is-free" /> Free</li>
        <li><span className="dot is-seated" /> Seated</li>
        <li><span className="dot is-uncleared" /> Left, to be cleared</li>
      </ul>
    </div>
  );
}
