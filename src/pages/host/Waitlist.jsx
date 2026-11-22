import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Problem from '../../components/Problem.jsx';
import SectionTabs from '../../components/SectionTabs.jsx';
import { fieldWords } from '../../data/messages.js';
import { BRANCH } from '../../data/restaurant.js';
import { useApp } from '../../state/AppContext.jsx';

/** The answer to "join the list": why not, or the panel ready for the next party. */
function JoinResult({ answer, sent }) {
  if (!answer || answer.status === 201) {
    return (
      <div className="result result-idle">
        <Icon name="users" size={28} />
        <p className="result-title">Add a party</p>
        <p className="result-text">They get a number, a place in the queue and the wait the restaurant quotes, stamped when they join.</p>
      </div>
    );
  }
  return <div className="result result-no"><Problem answer={answer} facts={sent} /></div>;
}

/** Meera's waitlist: POST /waitlist adds a party and quotes its wait. */
export default function Waitlist() {
  const { post } = useApp();
  const [name, setName] = useState('');
  const [covers, setCovers] = useState(2);
  const [phone, setPhone] = useState('');
  const [answer, setAnswer] = useState(null);
  // what the form sent, so a refusal can say what to fix in each box
  const [sent, setSent] = useState(null);

  const fieldErrors = fieldWords(answer, sent);

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
        <form className="card form" onSubmit={join} noValidate>
          <fieldset className="form-fields">
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
          <JoinResult answer={answer} sent={sent} />
        </div>
      </div>
    </div>
  );
}
