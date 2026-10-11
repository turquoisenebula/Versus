import { Link } from "react-router-dom";
import VoteBar from "./VoteBar";
import { formatRelativeTime } from "../../utils/formatDate";

function titleCase(value = "") {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function totalVotes(voteCounts = {}) {
  return (
    (Number(voteCounts.for) || 0) +
    (Number(voteCounts.against) || 0) +
    (Number(voteCounts.neutral) || 0)
  );
}

export default function DebateCard({ debate }) {
  const isClosed = debate.status === "closed";
  const endsAt = new Date(debate.endsAt).getTime();
  const ended = Number.isFinite(endsAt) && endsAt <= Date.now();

  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700">
          {debate.category}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isClosed ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {isClosed ? "Closed" : "Open"}
        </span>
      </div>
      <h2 className="mt-4 text-lg font-bold leading-snug text-slate-900">
        <Link className="rounded-sm hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" to={`/debates/${encodeURIComponent(debate._id)}`}>
          {debate.title}
        </Link>
      </h2>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
        {debate.description}
      </p>
      <div className="mt-3 text-sm text-slate-600">
        By{" "}
        <Link
          className="font-medium text-indigo-700 hover:underline"
          to={`/u/${encodeURIComponent(debate.creator?.username ?? "")}`}
        >
          {debate.creator?.username ?? "Unknown creator"}
        </Link>
      </div>
      <div className="mt-4">
        <VoteBar compact voteCounts={debate.voteCounts} />
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-xs text-slate-500">
        <span>{totalVotes(debate.voteCounts)} total votes</span>
        <span title={debate.endsAt ? new Date(debate.endsAt).toLocaleString() : ""}>
          {isClosed || ended
            ? "Ended"
            : debate.endsAt
              ? `Ends ${formatRelativeTime(debate.endsAt)}`
              : "End time unavailable"}
        </span>
      </div>
      {isClosed && (
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          Result: {debate.result === "draw" ? "Draw" : titleCase(debate.result)}
        </p>
      )}
    </article>
  );
}
