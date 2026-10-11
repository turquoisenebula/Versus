const STAT_LABELS = [
  ["debates", "Debates"],
  ["wins", "Wins"],
  ["losses", "Losses"],
  ["draws", "Draws"],
];

function formatWinRate(winRate) {
  return typeof winRate === "number" && Number.isFinite(winRate)
    ? `${Math.round(winRate * 100)}%`
    : "N/A";
}

export default function StatsCard({ stats = {}, winRate }) {
  return (
    <section
      aria-labelledby="profile-stats-heading"
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="text-lg font-semibold text-slate-900" id="profile-stats-heading">
        Stats
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STAT_LABELS.map(([key, label]) => (
          <div className="rounded-md bg-slate-50 p-3" key={key}>
            <dt className="text-sm text-slate-600">{label}</dt>
            <dd className="mt-1 text-xl font-semibold text-slate-900">
              {Number.isFinite(stats[key]) ? stats[key] : 0}
            </dd>
          </div>
        ))}
        <div className="rounded-md bg-slate-50 p-3">
          <dt className="text-sm text-slate-600">Win rate</dt>
          <dd className="mt-1 text-xl font-semibold text-slate-900">
            {formatWinRate(winRate)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
