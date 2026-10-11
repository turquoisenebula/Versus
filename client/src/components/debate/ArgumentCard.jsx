import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Avatar from "../common/Avatar";
import { formatRelativeTime } from "../../utils/formatDate";

export default function ArgumentCard({
  argument,
  user,
  isAuthenticated,
  debateClosed,
  onUpvote,
  pending,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const ownArgument =
    user?._id &&
    String(user._id) ===
      String(argument.author?._id ?? argument.author?.id ?? "");

  function handleUpvote() {
    if (!isAuthenticated) {
      toast("Log in to vote");
      navigate("/login", { state: { from: location } });
      return;
    }
    onUpvote(argument._id);
  }

  const disabledReason = ownArgument
    ? "You can't upvote your own argument"
    : debateClosed
      ? "Voting has ended"
      : undefined;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar
          avatar={argument.author?.avatar}
          username={argument.author?.username}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              className="break-all font-semibold text-slate-900 hover:text-indigo-700"
              to={`/u/${encodeURIComponent(argument.author?.username ?? "")}`}
            >
              {argument.author?.username ?? "Unknown author"}
            </Link>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${argument.side === "for" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}
            >
              {argument.side === "for" ? "For" : "Against"}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {argument.text}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <time
              className="text-xs text-slate-500"
              dateTime={argument.createdAt}
              title={argument.createdAt ? new Date(argument.createdAt).toLocaleString() : ""}
            >
              {argument.createdAt
                ? formatRelativeTime(argument.createdAt)
                : "Time unavailable"}
            </time>
            <button
              aria-label={`${argument.myUpvote ? "Remove upvote" : "Upvote"} argument; ${argument.upvoteCount ?? 0} upvotes`}
              className="min-h-10 rounded-md px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={Boolean(disabledReason) || pending}
              onClick={handleUpvote}
              title={disabledReason}
              type="button"
            >
              {argument.myUpvote ? "Upvoted" : "Upvote"} · {argument.upvoteCount ?? 0}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
