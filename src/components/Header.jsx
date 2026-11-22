import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BRANCH } from '../data/restaurant.js';
import { PERSONAS, personaForPath } from '../data/personas.js';
import { useApp, usePartyList } from '../state/AppContext.jsx';
import Icon from './Icon.jsx';
import useDismiss from './useDismiss.js';

export function Avatar({ persona, size = 34 }) {
  return (
    <span className="avatar" style={{ '--avatar': persona.color, width: size, height: size, fontSize: size * 0.42 }}>
      {persona.name.replace('A ', '')[0].toUpperCase()}
    </span>
  );
}

/**  The guest persona shows the party being viewed. */
function withParty(persona, party) {
  if (persona.id !== 'guest' || !party) return persona;
  return { ...persona, name: `${party.name} party`, role: `Guest · ${party.partyId}` };
}

/** The parties on the list, to view the app as one of them. */
function PartyList({ parties, value, onChoose }) {
  if (parties.length === 0) {
    return <p className="party-list-empty">Nobody is on the list yet. Add a party as Meera, the host.</p>;
  }
  return (
    <div className="party-list" role="listbox" aria-label="Parties">
      <p className="popover-label">Be the guest of</p>
      {parties.map((p) => (
        <button key={p.partyId} type="button" role="option" aria-selected={p.partyId === value}
          className={`party-option${p.partyId === value ? ' is-current' : ''}`} onClick={() => onChoose(p.partyId)}>
          <span className="party-option-id mono">{p.partyId}</span>
          <span className="party-option-name">{p.name}</span>
          <span className="party-option-covers">{p.covers} <Icon name="users" size={12} /></span>
        </button>
      ))}
    </div>
  );
}

function PersonaMenu({ current, parties }) {
  const [open, setOpen] = useState(false);
  const [partiesOpen, setPartiesOpen] = useState(false);
  const navigate = useNavigate();
  const box = useRef(null);
  const { guestParty, setGuestParty } = useApp();
  const party = parties.find((p) => p.partyId === guestParty);

  function close() {
    setOpen(false);
    setPartiesOpen(false);
  }
  useDismiss(box, open, close);

  function choose(persona) {
    close();
    navigate(persona.nav[0].to);
  }

  /** Become the guest of this party, and go to their wait. */
  function chooseParty(id) {
    setGuestParty(id);
    close();
    navigate('/guest');
  }

  return (
    <div className="persona-menu" ref={box}>
      <button type="button" className="persona-current" onClick={() => (open ? close() : setOpen(true))} aria-expanded={open}>
        <Avatar persona={current} size={30} />
        <span className="persona-current-text">
          <span className="persona-current-name">{current.name}</span>
          <span className="persona-current-role">{current.role}</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      {open && (
        <div className="persona-popover" role="menu">
          <p className="popover-label">View the restaurant as</p>
          {PERSONAS.map((base) => withParty(base, party)).map((p) => {
            const option = (
              <button key={p.id} type="button" role="menuitem" aria-haspopup={p.id === 'guest' ? 'listbox' : undefined}
                aria-expanded={p.id === 'guest' ? partiesOpen : undefined} aria-current={p.id === current.id ? 'true' : undefined}
                className={`persona-option${p.id === current.id ? ' is-current' : ''}${p.id === 'guest' && partiesOpen ? ' is-hovered' : ''}`}
                onClick={() => (p.id === 'guest' ? setPartiesOpen(true) : choose(p))}>
                <Avatar persona={p} size={34} />
                <span>
                  <span className="persona-option-name">{p.name}</span>
                  <span className="persona-option-role">{p.role}</span>
                </span>
                {p.id === current.id && <Icon name="check" size={16} className="persona-option-check" />}
              </button>
            );
            if (p.id !== 'guest') return option;
            // The guest opens the parties beside the menu: hover on a computer, a click on a phone.
            return (
              <div key={p.id} className="persona-option-wrap"
                onMouseEnter={() => setPartiesOpen(true)} onMouseLeave={() => setPartiesOpen(false)}>
                {option}
                {partiesOpen && (
                  <div className="persona-submenu">
                    <div className="persona-submenu-panel">
                      <PartyList parties={parties} value={guestParty} onChoose={chooseParty} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { pathname } = useLocation();
  const { guestParty } = useApp();
  const parties = usePartyList() ?? [];
  const found = personaForPath(pathname);
  const persona = found && withParty(found, parties.find((p) => p.partyId === guestParty));
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-start">
          {persona && (
            <Link to="/" className="back-home" aria-label="Back to the home page" title="Back to the home page">
              <Icon name="back" size={20} />
            </Link>
          )}
          <Link to="/" className="brand" aria-label="TableTurn home">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
            <span className="brand-text">
              <span className="brand-name">TableTurn</span>
              <span className="brand-place">{BRANCH.name} · {BRANCH.code}</span>
            </span>
          </Link>
        </div>

        <div className="header-tools">
          {persona && <PersonaMenu current={persona} parties={parties} />}
        </div>
      </div>
    </header>
  );
}
