/**
 * One table on the floor, seen from above: the tabletop with its chairs (two, four or six), the
 * table's number tag, and its state: free (green dot), seated (warm, with the minutes the party has
 * sat) or uncleared (greyed, plates left behind). The state comes from the backend's answer; it is
 * never decided here.
 */
export default function TableTop({ table, selected = false, onClick, style, compact = false }) {
  const { no, seats, state } = table;
  const perSide = Math.max(1, Math.round(seats / 2));
  const chairs = (side) => Array.from({ length: perSide }, (_, i) => <i key={`${side}${i}`} className="chair" />);
  const label = state === 'seated' ? `${table.seatedMinutes ?? 0} min`
    : state === 'uncleared' ? 'to clear' : `${seats} seats`;

  const content = (
    <>
      <span className="tt-tag mono">{no}</span>
      <span className="tt-room">
        <span className="tt-chairs is-top">{chairs('t')}</span>
        <span className="tt-top">
          {state === 'uncleared' && <span className="tt-plates" aria-hidden="true"><i /><i /></span>}
          {state === 'seated' && <span className="tt-party mono">{table.partyId}</span>}
        </span>
        <span className="tt-chairs is-bottom">{chairs('b')}</span>
      </span>
      <span className="tt-foot">
        <span className={`tt-dot is-${state}`} aria-hidden="true" />
        <span className="tt-label">{label}</span>
      </span>
    </>
  );

  const className = `tabletop seats-${seats} is-${state}${selected ? ' is-selected' : ''}${compact ? ' is-compact' : ''}`;
  if (!onClick) return <span className={className} style={style}>{content}</span>;

  return (
    <button type="button" className={className} style={style} onClick={onClick}
      aria-label={`Table ${no}, ${seats} seats, ${state}`}>
      {content}
    </button>
  );
}
