import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { BRANCH } from '../data/restaurant.js';
import { formatTime } from '../data/format.js';

/**
 * After a party joins the list: the host hands them their number, and they take their place in the queue.
 * 'hand' the ticket is printed at the host stand; drag it to the party (or tap it)
 * 'joining' the party holds it; their place in the queue lights up
 * 'done' done; OK clears the card for the next party
 * Drag and drop is HTML's own (draggable, onDragOver, onDrop). Tapping the ticket does the same, because phones
 * do not drag.
 */
export default function HandTicket({ party, queue, onDone, onOpen }) {
  const [stage, setStage] = useState('hand');
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState(false);

  function handOver() {
    if (stage !== 'hand') return;
    setOver(false);
    setDragging(false);
    setStage('joining');
  }

  // The party walks to the waiting area by itself once it holds its number.
  useEffect(() => {
    if (stage !== 'joining') return undefined;
    const timer = setTimeout(() => setStage('done'), 900);
    return () => clearTimeout(timer);
  }, [stage]);

  const covers = Math.max(1, Math.min(Number(party.covers) || 1, 6));
  const ticket = (
    <span className="ticket-paper">
      <span className="ticket-brand">{BRANCH.name}</span>
      <span className="ticket-no mono">{party.partyId}</span>
      <span className="ticket-line">{party.covers} {party.covers === 1 ? 'cover' : 'covers'} · about {party.quotedMinutes} min</span>
    </span>
  );

  return (
    <div className={`result result-ok place hand is-${stage}`}>
      <ol className="place-steps" aria-label="Steps">
        <li className={stage === 'hand' ? 'is-now' : 'is-done'}>
          <span>{stage === 'hand' ? '1' : <Icon name="check" size={12} strokeWidth={3} />}</span> Hand them their number
        </li>
        <li className={stage === 'done' ? 'is-done' : stage === 'joining' ? 'is-now' : ''}>
          <span>{stage === 'done' ? <Icon name="check" size={12} strokeWidth={3} /> : '2'}</span> In the queue
        </li>
      </ol>

      <div className="place-stage hand-stage">
        <div className={`hand-party${over ? ' is-over' : ''}${dragging ? ' is-waiting' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); handOver(); }}>
          <span className="hand-people" aria-hidden="true">
            {Array.from({ length: covers }, (_, i) => <span key={i} className="hand-person" style={{ '--i': i }} />)}
            {stage !== 'hand' && <span className="hand-held">{ticket}</span>}
          </span>
          <span className="hand-name">{party.name} party</span>
        </div>

        {stage === 'hand' && (
          <>
            <svg className="place-guide" viewBox="0 0 90 40" aria-hidden="true">
              <path d="M84 30 C 60 4, 30 4, 8 22" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
              <path d="M14 14 L6 23 L17 27" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <button type="button" className={`hand-ticket${dragging ? ' is-dragging' : ''}`} draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', party.partyId); e.dataTransfer.effectAllowed = 'move'; setDragging(true); }}
              onDragEnd={() => { setDragging(false); setOver(false); }}
              onClick={handOver}
              aria-label={`Ticket ${party.partyId}. Hand it to the ${party.name} party`}>
              {ticket}
            </button>
          </>
        )}
      </div>

      {stage !== 'hand' && (
        <ol className="queue-strip" aria-label="The queue, first in line on the left">
          {queue.map((p) => (
            <li key={p.partyId} className={p.partyId === party.partyId ? 'is-new' : undefined}>
              <span className="queue-place mono">{p.position}</span>
              <span className="queue-id mono">{p.partyId}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="place-caption" aria-live="polite">
        {stage === 'hand' && (
          <>
            <p className="place-title">Hand <span className="mono">{party.partyId}</span> to the {party.name} party</p>
            <p className="place-text">Drag the ticket to them, or tap it.</p>
          </>
        )}
        {stage === 'joining' && <p className="place-title">Taking their place…</p>}
        {stage === 'done' && (
          <>
            <p className="place-title">{party.name} party is number {party.position} in the queue</p>
            <p className="place-text">
              Joined at {formatTime(Date.parse(party.joinedAt))}, quoted about {party.quotedMinutes} min.
              {' '}<button type="button" className="link-btn" onClick={() => onOpen(party.partyId)}>Open {party.partyId}’s record <Icon name="arrow" size={14} /></button>
            </p>
          </>
        )}
      </div>

      {stage === 'done' && (
        <button type="button" className="btn btn-primary btn-lg btn-block place-ok" onClick={onDone} autoFocus>
          OK, next party
        </button>
      )}
    </div>
  );
}
