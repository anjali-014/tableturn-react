import Icon from '../../components/Icon.jsx';
import Problem from '../../components/Problem.jsx';
import { formatTime } from '../../data/format.js';
import { BRANCH } from '../../data/restaurant.js';
import { useApp, useGet, usePartyList } from '../../state/AppContext.jsx';

/** The party card: the wait quoted at the stand, and once seated the wait they actually had. */
function WaitCard({ party, now }) {
  const waitedSoFar = Math.max(0, Math.floor((now - Date.parse(party.joinedAt)) / 60000));
  const over = waitedSoFar - party.quotedMinutes;
  const share = Math.min(100, Math.round((waitedSoFar / Math.max(1, party.quotedMinutes)) * 100));

  return (
    <article className={`wait-card is-${party.state}`}>
      <header className="wait-card-head">
        <div>
          <p className="eyebrow">Party {party.partyId}</p>
          <p className="wait-card-name">{party.name} · {party.covers} {party.covers === 1 ? 'cover' : 'covers'}</p>
        </div>
        <span className="wait-place">
          <span className="wait-place-label">Place</span>
          <strong className="mono">{party.position}</strong>
        </span>
      </header>

      {party.state === 'waiting' ? (
        <div className="wait-now">
          <p className="wait-big"><strong className="mono">{party.quotedMinutes}</strong> min quoted</p>
          <div className="validity">
            <div className="validity-bar"><span style={{ width: `${share}%` }} className={over > 0 ? 'is-low' : undefined} /></div>
            <p className="validity-text">
              Waiting <strong>{waitedSoFar} min</strong> so far · joined at {formatTime(Date.parse(party.joinedAt))}
              {over > 0 && <> · <span className="is-over">{over} min past the quote</span></>}
            </p>
          </div>
        </div>
      ) : (
        <div className="wait-compare">
          <div><span className="wait-compare-label">Quoted</span><strong className="mono">{party.quotedMinutes} min</strong></div>
          <span className="wait-compare-dot" aria-hidden="true">·</span>
          <div><span className="wait-compare-label">Waited</span><strong className="mono">{party.waitedMinutes} min</strong></div>
          <span className="wait-compare-dot" aria-hidden="true">·</span>
          <div><span className="wait-compare-label">Table</span><strong className="mono">{party.table}</strong></div>
        </div>
      )}

      <footer className="wait-card-foot">
        {party.state === 'waiting' && <span className="muted">Meera will call {party.name} when a table is ready.</span>}
        {party.state === 'seated' && <span className="muted">Enjoy your meal. The wait was stamped when you sat down and never changes after.</span>}
        {(party.state === 'left' || party.state === 'cleared') && <span className="muted">Thanks for coming to {BRANCH.name}.</span>}
      </footer>
    </article>
  );
}

function PartyPicker() {
  const { setGuestParty } = useApp();
  const parties = usePartyList();
  if (!parties) return null;
  if (parties.length === 0) {
    return (
      <div className="empty">
        <Icon name="users" size={28} />
        <p className="empty-title">No party on the list yet</p>
        <p className="empty-text">Add one as Meera, the host, then come back and be that guest.</p>
      </div>
    );
  }
  return (
    <div className="pick-parties">
      {parties.map((p) => (
        <button key={p.partyId} type="button" className="pick-party" onClick={() => setGuestParty(p.partyId)}>
          <span className="mono">{p.partyId}</span> <strong>{p.name}</strong> <span className="muted">{p.covers} {p.covers === 1 ? 'cover' : 'covers'} · {p.state}</span>
        </button>
      ))}
    </div>
  );
}

/** A guest's view of their own party: GET /parties/{partyId}. */
export default function MyWait() {
  const { guestParty, now } = useApp();

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{BRANCH.name} · your table</p>
          <h1 className="page-title">My wait</h1>
        </div>
      </div>
      {guestParty ? <Party id={guestParty} now={now} /> : (
        <>
          <h2 className="section-title">Which party are you?</h2>
          <PartyPicker />
        </>
      )}
    </div>
  );
}

function Party({ id, now }) {
  const answer = useGet(`/parties/${id}`);
  if (!answer) return null;
  if (answer.status !== 200) return <Problem answer={answer} facts={{ partyId: id }} />;
  return <WaitCard party={answer.body} now={now} />;
}
