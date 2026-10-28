// Star-rating badge used on trade pro cards — shared by the in-app trade search
// results and the public registration preview so both look identical.

// Round to nearest 0.5  (e.g. 3.1→3.0, 3.26→3.5, 3.75→4.0)
export function roundHalf(n) {
  return Math.round(n * 2) / 2;
}

// Single star — full / half / empty
function StarIcon({ fill }) {
  if (fill === 'full')  return <span className="text-amber-400 leading-none" style={{ fontSize: 13 }}>★</span>;
  if (fill === 'empty') return <span className="text-slate-200 leading-none" style={{ fontSize: 13 }}>★</span>;
  // half — clip a filled star to 50 % width over an empty base
  return (
    <span className="relative inline-block leading-none" style={{ fontSize: 13 }}>
      <span className="text-slate-200">★</span>
      <span className="absolute inset-0 overflow-hidden text-amber-400" style={{ width: '50%' }}>★</span>
    </span>
  );
}

// onOpen optional — without it the badge is display-only
export default function GradeBadge({ avg, count, onOpen }) {
  if (!avg) return null;
  const rounded = roundHalf(avg);

  const COLOR =
    rounded >= 4.5 ? { bg: '#eef9f0', border: '#86efac', text: '#16a34a' } :
    rounded >= 3.5 ? { bg: '#fefce8', border: '#fde047', text: '#ca8a04' } :
    rounded >= 2.5 ? { bg: '#fff7ed', border: '#fdba74', text: '#ea580c' } :
                     { bg: '#fff1f2', border: '#fca5a5', text: '#dc2626' };

  const Tag = onOpen ? 'button' : 'span';
  return (
    <Tag
      {...(onOpen && {
        type: 'button',
        onClick: (e) => { e.stopPropagation(); onOpen(); },
        title: 'View trade profile',
      })}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition ${onOpen ? 'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer' : ''}`}
      style={{ background: COLOR.bg, borderColor: COLOR.border }}
    >
      <div className="flex items-center gap-px">
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = rounded >= n ? 'full' : rounded >= n - 0.5 ? 'half' : 'empty';
          return <StarIcon key={n} fill={fill} />;
        })}
      </div>
      <span className="text-xs font-extrabold leading-none" style={{ color: COLOR.text }}>
        {rounded.toFixed(1)}
      </span>
      {count > 0 && (
        <span className="text-[10px] font-medium text-slate-400 leading-none">({count})</span>
      )}
    </Tag>
  );
}
