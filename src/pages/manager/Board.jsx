import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import PartyNotebook from '../../components/PartyNotebook.jsx';
import { formatTime } from '../../data/format.js';
import { BRANCH } from '../../data/restaurant.js';
import { usePartyRecords } from '../../state/AppContext.jsx';

const average = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

/**
 * Ravi's board: every party of the evening, each read with GET /parties/{partyId}. The tiles are worked
 * out from those answers: how honest the quotes were and how long tables turned. A row opens the
 * party's record, which nobody can wipe.
 */
export default function Board() {
  const [openParty, setOpenParty] = useState(null);
  const records = usePartyRecords();
  const parties = records ?? [];

  const seatedOnce = parties.filter((p) => p.waitedMinutes != null);
  const gap = average(seatedOnce.map((p) => p.waitedMinutes - p.quotedMinutes));
  // each party's cleared event carries the turn its table earned
  const turns = parties.flatMap((p) => p.events.filter((e) => e.kind === 'cleared').map((e) => e.turnMinutes));
  const meanTurn = average(turns);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{BRANCH.name} · tonight</p>
          <h1 className="page-title">The board</h1>
        </div>
      </div>

      <div className="stats" style={{ '--stat-cols': 4 }}>
        <div className="stat"><span className="stat-label">Parties tonight</span><strong className="stat-value">{parties.length}</strong><span className="stat-note">{parties.filter((p) => p.state === 'waiting').length} still waiting</span></div>
        <div className="stat"><span className="stat-label">Seated now</span><strong className="stat-value">{parties.filter((p) => p.state === 'seated').length}</strong><span className="stat-note">at a table</span></div>
        <div className="stat"><span className="stat-label">Quote accuracy</span>
          <strong className="stat-value mono">{gap == null ? '—' : `${gap > 0 ? '+' : ''}${gap} min`}</strong>
          <span className="stat-note">{gap == null ? 'once a party is seated' : gap > 0 ? 'waited longer than quoted' : gap < 0 ? 'seated sooner than quoted' : 'exactly as quoted'}</span></div>
        <div className="stat"><span className="stat-label">Mean turn</span><strong className="stat-value mono">{meanTurn == null ? '—' : `${meanTurn} min`}</strong><span className="stat-note">{turns.length ? `over ${turns.length} cleared ${turns.length === 1 ? 'table' : 'tables'}` : 'once a table is cleared'}</span></div>
      </div>

      <h2 className="section-title">Every party</h2>
      {!records ? null : parties.length === 0 ? (
        <div className="empty">
          <Icon name="book" size={28} />
          <p className="empty-title">Nobody has joined the list yet</p>
          <p className="empty-text">When Meera adds a party, it appears here with its whole evening.</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead><tr><th>Party</th><th>Name</th><th>Covers</th><th>Joined</th><th>Quoted</th><th>Waited</th><th>Table</th><th>Now</th><th aria-label="Open" /></tr></thead>
            <tbody>
              {parties.map((p, i) => (
                <tr key={p.partyId} className="is-openable" style={{ '--i': i }} onClick={() => setOpenParty(p.partyId)}>
                  <td className="mono strong">{p.partyId}</td>
                  <td>{p.name}</td>
                  <td className="mono">{p.covers}</td>
                  <td className="mono">{formatTime(Date.parse(p.joinedAt))}</td>
                  <td className="mono">{p.quotedMinutes} min</td>
                  <td className="mono">{p.waitedMinutes != null ? `${p.waitedMinutes} min` : '—'}</td>
                  <td className="mono">{p.table ?? '—'}</td>
                  <td><span className={`pill pill-${p.state === 'seated' ? 'holding' : p.state === 'cleared' ? 'ok' : 'muted'}`}>{p.state}</span></td>
                  <td>
                    <button type="button" className="row-link" aria-label={`Open ${p.partyId}'s record`}
                      onClick={(e) => { e.stopPropagation(); setOpenParty(p.partyId); }}>
                      <Icon name="arrow" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openParty && <PartyNotebook key={openParty} id={openParty} onClose={() => setOpenParty(null)} />}
    </div>
  );
}
