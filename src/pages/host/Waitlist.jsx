import { useState } from 'react';
import HandTicket from '../../components/HandTicket.jsx';
import Icon from '../../components/Icon.jsx';
import PartyNotebook from '../../components/PartyNotebook.jsx';
import Problem from '../../components/Problem.jsx';
import SectionTabs from '../../components/SectionTabs.jsx';
import { formatTime } from '../../data/format.js';
import { fieldWords } from '../../data/messages.js';
import { BRANCH } from '../../data/restaurant.js';
import { useApp, usePartyRecords } from '../../state/AppContext.jsx';


/** The answer to "join the list": the party's number and place, or why not. */
/** The answer to "join the list": the party's number and place, or why not. */
function JoinResult({ answer, sent, queue, onOpen, onNext }) {
  if (!answer) {
    return (
      <div className="result result-idle">
        <Icon name="users" size={28} />
        <p className="result-title">Add a party</p>
        <p className="result-text">They get a number, a place in the queue and the wait the restaurant quotes, stamped when they join.</p>
      </div>
    );
  }
  if (answer.status === 201) {
    return <HandTicket key={answer.body.partyId} party={answer.body} queue={queue} onDone={onNext} onOpen={onOpen} />;
  }
  return <div className="result result-no"><Problem answer={answer} facts={sent} /></div>;
}

/**
 * Meera's waitlist: POST /waitlist adds a party and quotes its wait; each party on the list is read
 * with GET /parties/{partyId}.
 */
export default function Waitlist() {
  const { post, now } = useApp();
  const [name, setName] = useState('');
  const [covers, setCovers] = useState(2);
  const [phone, setPhone] = useState('');
  const [answer, setAnswer] = useState(null);
  // what the form sent, so a refusal can say what to fix in each box
  const [sent, setSent] = useState(null);
  const [openParty, setOpenParty] = useState(null);

  const records = usePartyRecords();
  const parties = records ?? [];
  const waiting = parties.filter((p) => p.state === 'waiting').sort((a, b) => a.position - b.position || a.partyId.localeCompare(b.partyId));
  const done = parties.filter((p) => p.state !== 'waiting');

  const fieldErrors = fieldWords(answer, sent);
  const handing = answer?.status === 201;   // a number was given: hand it over first

  async function join(e) {
    e.preventDefault();
    const body = { name, covers: Number(covers) };
    if (phone.trim()) body.phone = phone.trim();
    const result = await post('/waitlist', body);
    setSent(body);
    setAnswer(result);
    if (result.status === 201) { setName(''); setPhone(''); }
  }

     return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">{BRANCH.name} · tonight's list</p>
          <h1 className="page-title">Waitlist</h1>
        </div>
        <SectionTabs personaId="host" />
      </div>

      <div className="split">
        <form className={`card form${handing ? ' is-locked' : ''}`} onSubmit={join} noValidate>
          <fieldset className="form-fields" disabled={handing}>
            <div className="field">
              <label className="field-label" htmlFor="party-name"><span className="step-no">1</span> Name</label>
              <div className={`input-wrap${fieldErrors.name ? ' has-error' : ''}`}>
                <input id="party-name" className="input" value={name} placeholder="Kulkarni" autoComplete="off"
                  onChange={(e) => { setName(e.target.value); setAnswer(null); }} aria-invalid={Boolean(fieldErrors.name)} />
              </div>
              <p className={fieldErrors.name ? 'field-error' : 'field-help'}>{fieldErrors.name ?? 'One name for the party, as you would call it out.'}</p>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="party-covers"><span className="step-no">2</span> Covers</label>
              <div className="stepper">
                <button type="button" className="btn btn-key" onClick={() => { setCovers((c) => Math.max(0, Number(c) - 1)); setAnswer(null); }} aria-label="One fewer">−</button>
                <div className={`input-wrap stepper-value${fieldErrors.covers ? ' has-error' : ''}`}>
                  <input id="party-covers" className="input mono" type="number" value={covers}
                    onChange={(e) => { setCovers(e.target.value); setAnswer(null); }} aria-invalid={Boolean(fieldErrors.covers)} />
                </div>
                <button type="button" className="btn btn-key" onClick={() => { setCovers((c) => Number(c) + 1); setAnswer(null); }} aria-label="One more">+</button>
              </div>
              <p className={fieldErrors.covers ? 'field-error' : 'field-help'}>{fieldErrors.covers ?? 'How many people. The largest table seats six.'}</p>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="party-phone"><span className="step-no">3</span> Phone <span className="muted">(optional)</span></label>
              <div className={`input-wrap${fieldErrors.phone ? ' has-error' : ''}`}>
                <input id="party-phone" className="input mono" value={phone} placeholder="+919876543210"
                  onChange={(e) => { setPhone(e.target.value); setAnswer(null); }} aria-invalid={Boolean(fieldErrors.phone)} />
              </div>
              <p className={fieldErrors.phone ? 'field-error' : 'field-help'}>{fieldErrors.phone ?? 'Kept for calling them back. It never appears in the party’s record.'}</p>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block">
              Add to the list <Icon name="plus" size={18} />
            </button>
          </fieldset>
        </form>

        <div className="result-slot">
          <JoinResult answer={answer} sent={sent} queue={waiting} onOpen={setOpenParty} onNext={() => { setAnswer(null); setCovers(2); }} />
        </div>
      </div>

      <section className="list-section" aria-labelledby="waiting-title">
        <h2 id="waiting-title" className="section-title">
          On the list now <span className="section-count">{waiting.length}</span>
        </h2>

        {!records ? null : waiting.length === 0 ? (
          <div className="empty">
            <Icon name="list" size={28} />
            <p className="empty-title">Nobody is waiting</p>
            <p className="empty-text">Add a party above. Seat them from a table on the floor.</p>
          </div>
        ) : (
          <div className="table-card">
            <table className="table">
              <thead>
                <tr>
                  <th>Place</th>
                  <th>Party</th>
                  <th>Name</th>
                  <th>Covers</th>
                  <th>Joined</th>
                  <th>Quoted</th>
                  <th>Waiting</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {waiting.map((p, i) => (
                  <tr key={p.partyId} className="is-openable" style={{ '--i': i }} onClick={() => setOpenParty(p.partyId)}>
                    <td className="mono strong">{p.position}</td>
                    <td className="mono">{p.partyId}</td>
                    <td>{p.name}</td>
                    <td className="mono">{p.covers}</td>
                    <td className="mono">{formatTime(Date.parse(p.joinedAt))}</td>
                    <td className="mono">{p.quotedMinutes} min</td>
                    <td className="mono">{Math.floor((now - Date.parse(p.joinedAt)) / 60000)} min</td>
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
      </section>

      {done.length > 0 && (
        <section className="list-section" aria-labelledby="done-title">
          <h2 id="done-title" className="section-title">Seated tonight <span className="section-count">{done.length}</span></h2>
          <div className="table-card">
            <table className="table">
              <thead><tr><th>Party</th><th>Name</th><th>Covers</th><th>Table</th><th>Quoted</th><th>Waited</th><th>Now</th><th aria-label="Open" /></tr></thead>
              <tbody>
                {done.map((p, i) => (
                  <tr key={p.partyId} className="is-openable" style={{ '--i': i }} onClick={() => setOpenParty(p.partyId)}>
                    <td className="mono strong">{p.partyId}</td>
                    <td>{p.name}</td>
                    <td className="mono">{p.covers}</td>
                    <td className="mono">{p.table ?? '—'}</td>
                    <td className="mono">{p.quotedMinutes} min</td>
                    <td className="mono">{p.waitedMinutes != null ? `${p.waitedMinutes} min` : '—'}</td>
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
        </section>
      )}

      {openParty && <PartyNotebook key={openParty} id={openParty} onClose={() => setOpenParty(null)} />}
    </div>
  );
}
