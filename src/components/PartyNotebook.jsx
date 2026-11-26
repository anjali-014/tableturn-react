import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import Problem from './Problem.jsx';
import ScrollThumb from './ScrollThumb.jsx';
import { formatDay, formatTime, formatWhen } from '../data/format.js';
import { useGet } from '../state/AppContext.jsx';

/** What each kind of event line says. Events carry ids and facts, never the guest's phone. */
function eventText(event) {
  switch (event.kind) {
    case 'joined': return { icon: 'users', title: `Joined the list, ${event.covers} ${event.covers === 1 ? 'cover' : 'covers'}` };
    case 'quoted': return { icon: 'clock', title: `Quoted a ${event.quotedMinutes}-minute wait` };
    case 'seated': return { icon: 'grid', title: `Seated at ${event.table}`, note: `waited ${event.waitedMinutes} min` };
    case 'left': return { icon: 'door', title: 'Left the table' };
    case 'cleared': return { icon: 'check', title: 'Table cleared', note: `turn ${event.turnMinutes} min` };
    default: return { icon: 'list', title: event.kind };
  }
}

/** The rubber stamp on the page: the party's state now. */
const STAMPS = {
  waiting: { text: 'Waiting', tone: 'muted' },
  seated: { text: 'Seated', tone: 'holding' },
  left: { text: 'Left', tone: 'muted' },
  cleared: { text: 'Cleared', tone: 'go' },
};

/**
 * One party's record (GET /parties/{partyId}), opened like a notebook over the page you are on. The
 * address bar does not change: close it (×, Esc, or a click outside) and you are where you were.
 */
export default function PartyNotebook({ id, onClose }) {
  const answer = useGet(`/parties/${id}`);
  const [closing, setClosing] = useState(false);
  const closeRef = useRef(null);
  const pageRef = useRef(null);
  const party = answer?.status === 200 ? answer.body : null;
  // the turn: the record's cleared line
  const turn = party?.events.find((e) => e.kind === 'cleared')?.turnMinutes ?? null;

  function close() {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 220);
  }

  useEffect(() => {
    const before = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      before?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const stamp = party && STAMPS[party.state];

  return (
    <div className={`nb-scrim${closing ? ' is-closing' : ''}`} onClick={close}>
      <div className="nb-book" role="dialog" aria-modal="true" aria-labelledby="nb-title" onClick={(e) => e.stopPropagation()}>
        <div className="nb-cover" aria-hidden="true">
          <span className="nb-cover-label">
            <span className="nb-cover-small">Kothari's · Baner</span>
            <span className="nb-cover-big">The party book</span>
          </span>
        </div>

        <div ref={pageRef} className="nb-page">
          <div className="nb-rings" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} />)}</div>

          <header className="nb-head">
            <div>
              <p className="nb-eyebrow">{party ? `The party book · ${party.name}` : 'The party book'}</p>
              <h2 id="nb-title" className="nb-title mono">{party ? party.partyId : id}</h2>
            </div>
            {stamp && <span className={`nb-stamp tone-${stamp.tone}`}>{stamp.text}</span>}
            <button ref={closeRef} type="button" className="nb-close" onClick={close} aria-label="Close the notebook">
              <Icon name="x" size={18} />
            </button>
          </header>

          {answer && !party && (
            <div className="nb-blank">
              <p className="nb-hand">No page for “{id}” in this book.</p>
              <Problem answer={answer} facts={{ partyId: id }} compact />
              <p className="nb-help">Party ids look like <span className="mono">W001</span>. A party that was refused never gets a page, because nothing happened to it.</p>
            </div>
          )}

          {party && (
            <>
              <dl className="nb-facts">
                <div><dt>Party</dt><dd>{party.name}</dd><dd className="nb-sub">{party.covers} {party.covers === 1 ? 'cover' : 'covers'} · place {party.position}</dd></div>
                <div><dt>Joined</dt><dd>{formatDay(Date.parse(party.joinedAt))}</dd><dd className="nb-sub">at {formatTime(Date.parse(party.joinedAt))}</dd></div>
                <div><dt>Quoted</dt><dd>{party.quotedMinutes} min</dd><dd className="nb-sub">at {formatTime(Date.parse(party.quotedAt))}</dd></div>
                <div><dt>Waited</dt><dd>{party.waitedMinutes != null ? `${party.waitedMinutes} min` : '—'}</dd><dd className="nb-sub">{party.table ? `table ${party.table}` : 'not seated yet'}</dd></div>
                {turn != null && <div><dt>Turn</dt><dd>{turn} min</dd><dd className="nb-sub">seated to left</dd></div>}
              </dl>

              <div className="nb-section">
                <h3 className="nb-hand">What happened</h3>
                <span className="nb-lock"><Icon name="lock" size={13} /> Can’t be wiped</span>
              </div>
              <ol className="nb-lines">
                {party.events.map((event, i) => {
                  const text = eventText(event);
                  return (
                    <li key={i} className={`nb-line kind-${event.kind}`} style={{ '--i': i }}>
                      <span className="nb-icon"><Icon name={text.icon} size={14} /></span>
                      <span className="nb-text">
                        <strong>{text.title}</strong>
                        <span className="nb-note">
                          <time>{formatWhen(Date.parse(event.at))}</time>{text.note && ` · ${text.note}`}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          <aside className="nb-tip">
            <p className="nb-tip-title"><Icon name="book" size={15} /> How this book works</p>
            <p>Every change to a party adds a line here, written together with the change itself. A refused seating leaves no line. Lines are only ever added: nothing is rewritten or wiped, so you can always answer why one party was seated before another.</p>
            <p className="nb-tip-small">It opens over the page you are on. Close it with ×, Esc or a click outside and you are right where you were.</p>
          </aside>
        </div>
        <ScrollThumb target={pageRef} />
      </div>
    </div>
  );
}
