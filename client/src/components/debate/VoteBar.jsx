const VOTE_SIDES = [
  { key: "for", label: "For", color: "bg-emerald-500", text: "text-emerald-700" },
  { key: "against", label: "Against", color: "bg-rose-500", text: "text-rose-700" },
  { key: "neutral", label: "Neutral", color: "bg-slate-400", text: "text-slate-700" },
];

export default function VoteBar({ voteCounts = {}, compact = false }) {
  const counts = {
    for: Number(voteCounts.for) || 0,
    against: Number(voteCounts.against) || 0,
    neutral: Number(voteCounts.neutral) || 0,
  };
  const total = counts.for + counts.against + counts.neutral;

  return (
    <div aria-label={`Vote totals: ${total}`} className="w-full">
      <div
        aria-label={`Vote distribution: ${VOTE_SIDES.map(
          ({ key, label }) =>
            `${label} ${total ? Math.round((counts[key] / total) * 100) : 0}%`,
        ).join(", ")}`}
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="img"
      >
        {VOTE_SIDES.map(({ key, label, color }) => {
          const percentage = total ? (counts[key] / total) * 100 : 0;
          return (
            <span
              aria-label={`${label}: ${counts[key]}`}
              className={color}
              key={key}
              style={{ width: `${percentage}%` }}
            />
          );
        })}
      </div>
      <div
        className={`mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 ${compact ? "text-xs" : "text-sm"}`}
      >
        {VOTE_SIDES.map(({ key, label, text }) => {
          const percentage = total
            ? Math.round((counts[key] / total) * 100)
            : 0;
          return (
            <span className={text} key={key}>
              {label} <strong>{counts[key]}</strong>{" "}
              <span className="text-slate-500">({percentage}%)</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
