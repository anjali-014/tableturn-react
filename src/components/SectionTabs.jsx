import { NavLink } from 'react-router-dom';
import { PERSONAS } from '../data/personas.js';
import { usePartyList } from '../state/AppContext.jsx';
import Icon from './Icon.jsx';

/**
 * The host's two screens, shown in the page's title row. The current one
 * is filled with the person's colour; a badge counts what is waiting there.
 */
export default function SectionTabs({ personaId }) {
  const parties = usePartyList() ?? [];
  const persona = PERSONAS.find((p) => p.id === personaId);
  const waiting = parties.filter((p) => p.state === 'waiting').length;
  const badges = { '/host/waitlist': waiting };

  return (
    <nav className="section-tabs" aria-label={`${persona.name}'s screens`} style={{ '--persona': persona.color }}>
      {persona.nav.map((item) => (
        <NavLink key={item.to} to={item.to} end
          className={({ isActive }) => `section-tab${isActive ? ' is-active' : ''}`}>
          <Icon name={item.icon} size={17} strokeWidth={2} />
          <span>{item.label}</span>
          {badges[item.to] > 0 && <span className="section-tab-badge">{badges[item.to]}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
