import { Link } from 'react-router-dom';
import { Avatar } from '../components/Header.jsx';
import Icon from '../components/Icon.jsx';
import TableTop from '../components/TableTop.jsx';
import { BRANCH } from '../data/restaurant.js';
import { PERSONAS } from '../data/personas.js';
import { useGet } from '../state/AppContext.jsx';

/** The first screen: what TableTurn is, a slice of the real floor, and who you want to be. */
export default function Welcome() {
  const answer = useGet(`/branches/${BRANCH.code}/tables`);
  const tables = answer?.status === 200 ? answer.body.tables : [];
  const free = tables.filter((t) => t.state === 'free').length;
  // A slice of the real floor for the hero: some twos, some fours and a six.
  const preview = [...tables.slice(0, 4), ...tables.slice(10, 13), ...tables.slice(18, 19)];

  return (
    <div className="welcome">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{BRANCH.name} · {BRANCH.place}</p>
          <h1 className="hero-title">
            Twenty-two tables.<br />
            <span>No wipe-clean board.</span>
          </h1>
          <p className="hero-lede">
            Every party gets a place in the queue and an honest wait, every table knows whether it is free,
            seated or waiting to be cleared, and the manager can read every party's evening at a glance.
          </p>
          <div className="hero-facts">
            <div><strong>{tables.length}</strong><span>tables</span></div>
            <div><strong className="is-free">{free}</strong><span>free right now</span></div>
            <div><strong>{tables.length - free}</strong><span>in use</span></div>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-floor">
            {preview.map((t, i) => <TableTop key={t.no} table={t} compact style={{ '--i': i }} />)}
          </div>
        </div>
      </section>

      <section className="pick" aria-labelledby="pick-title">
        <div className="pick-head">
          <h2 id="pick-title" className="section-title">Who are you today?</h2>
          <p className="section-sub">Each person sees their own screens. Everything they do changes the same floor.</p>
        </div>
        <div className="pick-grid">
          {PERSONAS.map((p, i) => (
            <Link key={p.id} to={p.nav[0].to} className="pick-card" style={{ '--persona': p.color, '--i': i }}>
              <Avatar persona={p} size={44} />
              <span className="pick-name">{p.name}</span>
              <span className="pick-role">{p.role}</span>
              <span className="pick-blurb">{p.blurb}</span>
              <span className="pick-go">Continue as {p.id === 'guest' ? 'a guest' : p.name} <Icon name="arrow" size={16} /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
