export default function BadgeList({ badges = {} }) {
  const bestArguments = Number.isFinite(badges.bestArguments)
    ? badges.bestArguments
    : 0;

  return (
    <section
      aria-labelledby="profile-badges-heading"
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="text-lg font-semibold text-slate-900" id="profile-badges-heading">
        Badges
      </h2>
      {bestArguments > 0 ? (
        <ul className="mt-3">
          <li className="inline-flex flex-wrap items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-medium">Best Argument</span>
            <span aria-label={`${bestArguments} Best Argument badges`}>
              {bestArguments}
            </span>
          </li>
        </ul>
      ) : (
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-600">
          No badges yet.
        </p>
      )}
    </section>
  );
}
