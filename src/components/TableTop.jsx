/**
 * One table on the floor, seen from above: the tabletop with its chairs (two, four or six), the
 *  table's number tag, and a dot for its state: free, seated or uncleared. The state comes from the
 * backend's answer; it is never decided here.
 */
export default function TableTop({ table, style, compact = false }) {
  const { no, seats, state } = table;
  const perSide = Math.max(1, Math.round(seats / 2));
  const chairs = (side) => Array.from({ length: perSide }, (_, i) => <i key={`${side}${i}`} className="chair" />);
  const className = `tabletop seats-${seats} is-${state}${compact ? ' is-compact' : ''}`;
  return (
    <span className={className} style={style}>
      <span className="tt-tag mono">{no}</span>
      <span className="tt-room">
        <span className="tt-chairs is-top">{chairs('t')}</span>
        <span className="tt-top" />
        <span className="tt-chairs is-bottom">{chairs('b')}</span>
      </span>
      <span className="tt-foot">
        <span className={`tt-dot is-${state}`} aria-hidden="true" />
      </span>
    </span>
  );
}
