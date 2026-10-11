import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  castVote,
  getDebate,
  listArguments,
  postArgument,
  removeVote,
  toggleUpvote,
} from "../api/debate.api";
import ArgumentCard from "../components/debate/ArgumentCard";
import ArgumentForm from "../components/debate/ArgumentForm";
import VoteBar from "../components/debate/VoteBar";
import VoteButtons from "../components/debate/VoteButtons";
import Avatar from "../components/common/Avatar";
import Loader from "../components/common/Loader";
import useAuth from "../hooks/useAuth";
import { ARGUMENT_SORT_OPTIONS } from "../utils/constants";
import {
  formatAbsoluteDate,
  formatRelativeTime,
} from "../utils/formatDate";

const ARGUMENT_PAGE_SIZE = 10;

function errorMessage(error, fallback) {
  return error.response?.data?.message ?? fallback;
}

function isCanceled(error) {
  return error.code === "ERR_CANCELED";
}

function resultLabel(result) {
  if (result === "draw") return "Draw";
  if (result === "for") return "For";
  if (result === "against") return "Against";
  return "Pending";
}

export default function DebateDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [debate, setDebate] = useState(null);
  const [debateLoading, setDebateLoading] = useState(true);
  const [debateError, setDebateError] = useState(null);
  const [debateRetry, setDebateRetry] = useState(0);
  const [argumentsList, setArgumentsList] = useState([]);
  const [mySide, setMySide] = useState(null);
  const [argumentPage, setArgumentPage] = useState(1);
  const [argumentPages, setArgumentPages] = useState(0);
  const [argumentTotal, setArgumentTotal] = useState(0);
  const [argumentSide, setArgumentSide] = useState("all");
  const [argumentSort, setArgumentSort] = useState("newest");
  const [argumentsLoading, setArgumentsLoading] = useState(true);
  const [argumentsError, setArgumentsError] = useState(null);
  const [argumentsRetry, setArgumentsRetry] = useState(0);
  const [votePending, setVotePending] = useState(false);
  const [argumentPending, setArgumentPending] = useState(false);
  const [upvotePending, setUpvotePending] = useState({});
  const [newlyPosted, setNewlyPosted] = useState(null);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setDebateLoading(true);
    setDebateError(null);
    setDebate(null);

    getDebate(id, { signal: controller.signal })
      .then(({ debate: loadedDebate }) => {
        setDebate(loadedDebate);
        setMySide(loadedDebate.mySide ?? null);
      })
      .catch((error) => {
        if (!controller.signal.aborted && !isCanceled(error)) {
          setDebateError(error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDebateLoading(false);
        }
      });

    return () => controller.abort();
  }, [id, debateRetry]);

  const fetchArguments = useCallback(
    (signal) =>
      listArguments(
        id,
        {
          page: argumentPage,
          limit: ARGUMENT_PAGE_SIZE,
          sort: argumentSort,
          ...(argumentSide === "all" ? {} : { side: argumentSide }),
        },
        { signal },
      ),
    [argumentPage, argumentSide, argumentSort, id],
  );

  useEffect(() => {
    const controller = new AbortController();
    setArgumentsLoading(true);
    setArgumentsError(null);

    fetchArguments(controller.signal)
      .then((result) => {
        let loadedArguments = result.arguments;
        if (
          newlyPosted &&
          argumentPage === 1 &&
          (argumentSide === "all" || newlyPosted.side === argumentSide)
        ) {
          loadedArguments = [
            newlyPosted,
            ...loadedArguments.filter(
              (argument) => String(argument._id) !== String(newlyPosted._id),
            ),
          ].slice(0, ARGUMENT_PAGE_SIZE);
        }
        setArgumentsList(loadedArguments);
        setMySide(result.mySide ?? null);
        setArgumentPages(result.totalPages);
        setArgumentTotal(result.total);
      })
      .catch((error) => {
        if (!controller.signal.aborted && !isCanceled(error)) {
          setArgumentsError(error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setArgumentsLoading(false);
        }
      });

    return () => controller.abort();
  }, [fetchArguments, argumentsRetry, newlyPosted, argumentPage, argumentSide]);

  const endTime = new Date(debate?.endsAt).getTime();
  const debateClosed = debate?.status === "closed";
  const votingEnded =
    debateClosed || (Number.isFinite(endTime) && endTime <= clock);
  const result = useMemo(() => resultLabel(debate?.result), [debate?.result]);

  async function handleVote(choice) {
    if (!isAuthenticated) {
      toast("Log in to vote");
      navigate("/login", { state: { from: location } });
      return;
    }
    if (votingEnded || votePending || debate?.myVote === choice) {
      return;
    }

    setVotePending(true);
    try {
      const voteState = await castVote(id, choice);
      setDebate((current) => ({
        ...current,
        myVote: voteState.myVote,
        voteCounts: voteState.voteCounts,
      }));
    } catch (error) {
      toast.error(errorMessage(error, "Unable to save your vote."));
    } finally {
      setVotePending(false);
    }
  }

  async function handleRemoveVote() {
    if (votingEnded || votePending) {
      return;
    }

    setVotePending(true);
    try {
      const voteState = await removeVote(id);
      setDebate((current) => ({
        ...current,
        myVote: voteState.myVote,
        voteCounts: voteState.voteCounts,
      }));
    } catch (error) {
      toast.error(errorMessage(error, "Unable to remove your vote."));
    } finally {
      setVotePending(false);
    }
  }

  async function handlePostArgument(body) {
    setArgumentPending(true);
    try {
      const { argument } = await postArgument(id, body);
      const posted = { ...argument, myUpvote: false };
      setNewlyPosted(posted);
      setArgumentsList((current) => [
        posted,
        ...current.filter((item) => String(item._id) !== String(posted._id)),
      ].slice(0, ARGUMENT_PAGE_SIZE));
      setArgumentSide("all");
      setArgumentPage(1);
      setMySide(body.side);
      setArgumentTotal((total) => total + 1);
      toast.success("Your argument was posted.");
      return true;
    } catch (error) {
      toast.error(errorMessage(error, "Unable to post your argument."));
      return false;
    } finally {
      setArgumentPending(false);
    }
  }

  async function handleUpvote(argumentId) {
    setUpvotePending((current) => ({ ...current, [argumentId]: true }));
    try {
      const result = await toggleUpvote(argumentId);
      setArgumentsList((current) =>
        current.map((argument) =>
          String(argument._id) === String(argumentId)
            ? {
                ...argument,
                upvoteCount: result.upvoteCount,
                myUpvote: result.upvoted,
              }
            : argument,
        ),
      );
    } catch (error) {
      toast.error(errorMessage(error, "Unable to update your upvote."));
    } finally {
      setUpvotePending((current) => ({ ...current, [argumentId]: false }));
    }
  }

  if (debateLoading) {
    return <Loader label="Loading debate..." />;
  }

  if (debateError?.response?.status === 404) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-14 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Debate not found</h1>
        <p className="mt-2 text-slate-600">This debate may have been removed.</p>
        <Link className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700" to="/">
          Back to debates
        </Link>
      </section>
    );
  }

  if (debateError) {
    return (
      <section className="rounded-xl border border-red-200 bg-white p-6 text-center" role="alert">
        <h1 className="text-xl font-bold text-slate-900">We couldn't load this debate.</h1>
        <p className="mt-2 text-slate-600">
          {errorMessage(debateError, "Please try again.")}
        </p>
        <button
          className="mt-4 min-h-11 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => setDebateRetry((count) => count + 1)}
          type="button"
        >
          Retry
        </button>
      </section>
    );
  }

  if (!debate) {
    return null;
  }

  const creator = debate.creator ?? {};
  const bestArgument = debate.bestArgument;

  return (
    <section className="space-y-8">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700">
            {debate.category}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${debateClosed ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-800"}`}>
            {debateClosed ? "Closed" : "Open"}
          </span>
          {debateClosed && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
              Result: {result}
            </span>
          )}
        </div>
        <h1 className="mt-4 break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {debate.title}
        </h1>
        <p className="mt-4 whitespace-pre-wrap break-words text-base leading-7 text-slate-700">
          {debate.description}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-slate-100 pb-5">
          <Avatar avatar={creator.avatar} username={creator.username} />
          <p className="text-sm text-slate-600">
            Started by{" "}
            <Link
              className="font-semibold text-indigo-700 hover:underline"
              to={`/u/${encodeURIComponent(creator.username ?? "")}`}
            >
              {creator.username ?? "Unknown creator"}
            </Link>
          </p>
          {debate.endsAt && (
            <p
              className="text-sm text-slate-500"
              title={formatAbsoluteDate(debate.endsAt)}
            >
              {votingEnded
                ? `Ended ${formatRelativeTime(debate.endsAt)}`
                : `Ends ${formatRelativeTime(debate.endsAt)}`}
            </p>
          )}
        </div>

        {votingEnded && !debateClosed && (
          <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Ended, results pending
          </p>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <h2 className="mb-3 font-semibold text-slate-900">Vote totals</h2>
            <VoteBar voteCounts={debate.voteCounts} />
          </div>
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Cast your vote</h2>
              {debate.myVote && (
                <span className="text-sm text-slate-600">
                  Your vote: <strong className="capitalize">{debate.myVote}</strong>
                </span>
              )}
            </div>
            {votingEnded ? (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700" role="status">
                Voting has ended
              </p>
            ) : !isAuthenticated ? (
              <button
                className="min-h-11 w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => {
                  toast("Log in to vote");
                  navigate("/login", { state: { from: location } });
                }}
                type="button"
              >
                Log in to vote
              </button>
            ) : (
              <VoteButtons
                disabled={votingEnded}
                myVote={debate.myVote}
                onRemove={handleRemoveVote}
                onVote={handleVote}
                pending={votePending}
              />
            )}
          </div>
        </div>

        {debateClosed && bestArgument && (
          <aside className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
              Best argument
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
              {bestArgument.text}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Avatar
                  avatar={bestArgument.author?.avatar}
                  className="size-8"
                  username={bestArgument.author?.username}
                />
                <span className="text-sm text-slate-700">
                  <Link
                    className="font-semibold text-indigo-700 hover:underline"
                    to={`/u/${encodeURIComponent(bestArgument.author?.username ?? "")}`}
                  >
                    {bestArgument.author?.username ?? "Unknown author"}
                  </Link>
                  {" · "}
                  <span className="capitalize">{bestArgument.side}</span>
                </span>
              </div>
              <span className="text-sm font-semibold text-amber-900">
                {bestArgument.upvoteCount} upvotes
              </span>
            </div>
          </aside>
        )}
      </article>

      <section aria-labelledby="arguments-heading" className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900" id="arguments-heading">
              Arguments
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {argumentTotal} {argumentTotal === 1 ? "argument" : "arguments"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Filter arguments
              </span>
              <div
                aria-label="Filter arguments by side"
                className="flex min-h-10 overflow-hidden rounded-lg border border-slate-300 bg-white"
                role="group"
              >
                {[
                  { value: "all", label: "All" },
                  { value: "for", label: "For" },
                  { value: "against", label: "Against" },
                ].map((option) => (
                  <button
                    aria-pressed={argumentSide === option.value}
                    className={`min-h-10 px-3 text-sm font-medium focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-indigo-600 ${argumentSide === option.value ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                    key={option.value}
                    onClick={() => {
                      setArgumentSide(option.value);
                      setArgumentPage(1);
                      setNewlyPosted(null);
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="argument-sort">
                Sort by
              </label>
              <select
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                id="argument-sort"
                onChange={(event) => {
                  setArgumentSort(event.target.value);
                  setArgumentPage(1);
                  setNewlyPosted(null);
                }}
                value={argumentSort}
              >
                {ARGUMENT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!votingEnded && (
          isAuthenticated ? (
            <ArgumentForm
              mySide={mySide}
              onSubmit={handlePostArgument}
              submitting={argumentPending}
            />
          ) : (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-slate-700">
              <Link
                className="font-semibold text-indigo-700 hover:underline"
                onClick={() => toast("Log in to post an argument")}
                state={{ from: location }}
                to="/login"
              >
                Log in to post an argument
              </Link>
            </div>
          )
        )}

        {argumentsLoading ? (
          <Loader label="Loading arguments..." />
        ) : argumentsError ? (
          <div className="rounded-xl border border-red-200 bg-white p-5 text-center" role="alert">
            <p className="font-semibold text-slate-900">We couldn't load the arguments.</p>
            <p className="mt-1 text-sm text-slate-600">
              {errorMessage(argumentsError, "Please try again.")}
            </p>
            <button
              className="mt-3 min-h-10 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              onClick={() => setArgumentsRetry((count) => count + 1)}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : argumentsList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            No arguments yet for this selection.
          </div>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {argumentsList.map((argument) => (
              <ArgumentCard
                argument={argument}
                debateClosed={votingEnded}
                isAuthenticated={isAuthenticated}
                key={argument._id}
                onUpvote={handleUpvote}
                pending={Boolean(upvotePending[argument._id])}
                user={user}
              />
            ))}
          </div>
        )}

        {!argumentsLoading && !argumentsError && argumentPages > 0 && (
          <nav aria-label="Argument pages" className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <button
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={argumentPage <= 1}
              onClick={() => setArgumentPage((page) => page - 1)}
              type="button"
            >
              Previous
            </button>
            <span aria-live="polite" className="text-sm text-slate-600">
              {argumentPage} / {argumentPages}
            </span>
            <button
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={argumentPage >= argumentPages}
              onClick={() => setArgumentPage((page) => page + 1)}
              type="button"
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </section>
  );
}
