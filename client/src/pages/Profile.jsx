import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getProfile, getUserDebates, updateMyProfile } from "../api/user.api";
import Avatar from "../components/common/Avatar";
import Loader from "../components/common/Loader";
import VoteBar from "../components/debate/VoteBar";
import BadgeList from "../components/profile/BadgeList";
import StatsCard from "../components/profile/StatsCard";
import useAuth from "../hooks/useAuth";

const PAGE_SIZE = 10;
const DEBATE_TYPES = ["all", "created", "argued"];
const TYPE_LABELS = {
  all: "All",
  created: "Created",
  argued: "Argued",
};

function parsePage(value) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function isCanceled(error) {
  return error.code === "ERR_CANCELED";
}

function errorMessage(error) {
  const message = error.response?.data?.message;
  return typeof message === "string" && message
    ? message
    : "Unable to load this profile. Please try again.";
}

function safeAvatarUrl(value) {
  if (typeof value !== "string" || !value) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

function formatJoinedDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function resultLabel(result) {
  if (result === "for") return "For";
  if (result === "against") return "Against";
  if (result === "draw") return "Draw";
  return "Pending";
}

function outcomeLabel(outcome) {
  if (outcome === "won") return "Won";
  if (outcome === "lost") return "Lost";
  if (outcome === "draw") return "Draw";
  return "Pending";
}

function badgeClass(outcome) {
  if (outcome === "won") return "bg-emerald-100 text-emerald-800";
  if (outcome === "lost") return "bg-rose-100 text-rose-800";
  if (outcome === "draw") return "bg-slate-200 text-slate-800";
  return "bg-amber-100 text-amber-900";
}

function inputClass(hasError = false) {
  return `mt-1 w-full rounded-md border px-3 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
    hasError ? "border-rose-500" : "border-slate-300"
  }`;
}

function DebateItem({ debate }) {
  const argued = Boolean(debate.side);

  return (
    <li className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            className="break-words text-lg font-semibold text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            to={`/debates/${encodeURIComponent(debate.id)}`}
          >
            {debate.title}
          </Link>
          <p className="mt-1 text-sm text-slate-600">
            {debate.category} <span aria-hidden="true">·</span>{" "}
            <span className="capitalize">{debate.status}</span>
            <span className="sr-only"> debate</span>
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
          Result: {resultLabel(debate.result)}
        </span>
      </div>

      {argued && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-700">
            Argued <span className="font-medium capitalize">{debate.side}</span>
          </span>
          <span
            className={`rounded-full px-2.5 py-1 font-medium ${badgeClass(debate.outcome)}`}
          >
            {outcomeLabel(debate.outcome)}
          </span>
        </div>
      )}

      <div className="mt-4">
        <VoteBar compact voteCounts={debate.voteCounts} />
      </div>
    </li>
  );
}

export default function Profile() {
  const { username = "" } = useParams();
  const { user, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get("type");
  const requestedPage = searchParams.get("page");
  const type = DEBATE_TYPES.includes(requestedType) ? requestedType : "all";
  const page = parsePage(requestedPage);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [profileRetry, setProfileRetry] = useState(0);
  const [debates, setDebates] = useState([]);
  const [debatesLoading, setDebatesLoading] = useState(true);
  const [debatesError, setDebatesError] = useState(null);
  const [debatesRetry, setDebatesRetry] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [editValues, setEditValues] = useState({ bio: "", avatar: "" });
  const [editErrors, setEditErrors] = useState({});
  const [editSubmitted, setEditSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const previousUsername = useRef(username);
  const currentUsername = useRef(username);
  currentUsername.current = username;

  const isOwnProfile =
    Boolean(user?.username) &&
    user.username.toLowerCase() === username.toLowerCase();

  useEffect(() => {
    if (previousUsername.current !== username) {
      previousUsername.current = username;
      setSearchParams({ type: "all", page: "1" }, { replace: true });
      setProfile(null);
      setDebates([]);
      setTotalPages(0);
    }
  }, [username, setSearchParams]);

  useEffect(() => {
    if (
      requestedType !== type ||
      requestedPage !== String(page)
    ) {
      setSearchParams({ type, page: String(page) }, { replace: true });
    }
  }, [page, requestedPage, requestedType, setSearchParams, type]);

  useEffect(() => {
    const controller = new AbortController();
    const requestedUsername = username;
    setProfileLoading(true);
    setProfileError(null);
    setProfile(null);

    getProfile(requestedUsername, { signal: controller.signal })
      .then(({ user: loadedProfile }) => {
        if (
          !controller.signal.aborted &&
          currentUsername.current === requestedUsername
        ) {
          setProfile(loadedProfile);
        }
      })
      .catch((error) => {
        if (
          !controller.signal.aborted &&
          !isCanceled(error) &&
          currentUsername.current === requestedUsername
        ) {
          setProfileError(error);
        }
      })
      .finally(() => {
        if (
          !controller.signal.aborted &&
          currentUsername.current === requestedUsername
        ) {
          setProfileLoading(false);
        }
      });

    return () => controller.abort();
  }, [username, profileRetry]);

  useEffect(() => {
    const controller = new AbortController();
    const requestedUsername = username;
    setDebatesLoading(true);
    setDebatesError(null);

    getUserDebates(
      requestedUsername,
      { type, page, limit: PAGE_SIZE },
      { signal: controller.signal },
    )
      .then((result) => {
        if (
          !controller.signal.aborted &&
          currentUsername.current === requestedUsername
        ) {
          const lastPage = Math.max(result.totalPages, 1);
          if (page > lastPage) {
            setSearchParams(
              { type, page: String(lastPage) },
              { replace: true },
            );
          } else {
            setDebates(result.debates);
            setTotalPages(result.totalPages);
          }
        }
      })
      .catch((error) => {
        if (
          !controller.signal.aborted &&
          !isCanceled(error) &&
          currentUsername.current === requestedUsername
        ) {
          setDebatesError(error);
        }
      })
      .finally(() => {
        if (
          !controller.signal.aborted &&
          currentUsername.current === requestedUsername
        ) {
          setDebatesLoading(false);
        }
      });

    return () => controller.abort();
  }, [username, type, page, debatesRetry]);

  useEffect(() => {
    if (profile) {
      setEditValues({
        bio: profile.bio ?? "",
        avatar: profile.avatar ?? "",
      });
      setEditErrors({});
      setEditSubmitted(false);
    }
  }, [profile]);

  function validateEdit(values) {
    const errors = {};
    if (values.bio.length > 300) {
      errors.bio = "Bio must be at most 300 characters";
    }
    if (values.avatar.length > 500) {
      errors.avatar = "Avatar must be at most 500 characters";
    } else if (!safeAvatarUrl(values.avatar) && values.avatar !== "") {
      errors.avatar =
        "Avatar must be a valid HTTP or HTTPS URL or an empty string";
    }
    return errors;
  }

  function updateEditField(field, value) {
    const nextValues = { ...editValues, [field]: value };
    setEditValues(nextValues);
    if (editSubmitted || editErrors[field]) {
      setEditErrors(validateEdit(nextValues));
    }
  }

  async function handleProfileUpdate(event) {
    event.preventDefault();
    if (saving) return;
    setEditSubmitted(true);
    const validationErrors = validateEdit(editValues);
    setEditErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const requestedUsername = username;
    setSaving(true);
    try {
      const { user: updatedProfile } = await updateMyProfile({
        bio: editValues.bio,
        avatar: editValues.avatar,
      });
      if (currentUsername.current === requestedUsername) {
        setProfile(updatedProfile);
        updateUser(updatedProfile);
        toast.success("Profile updated");
      }
    } catch (error) {
      const message = error.response?.data?.message;
      toast.error(
        typeof message === "string" && message
          ? message
          : "Unable to update your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function changeTab(nextType) {
    setSearchParams({ type: nextType, page: "1" });
  }

  function changePage(nextPage) {
    setSearchParams({ type, page: String(nextPage) });
  }

  if (
    profileLoading ||
    (profile && profile.username.toLowerCase() !== username.toLowerCase())
  ) {
    return <Loader label="Loading profile..." />;
  }

  if (profileError?.response?.status === 404) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">User not found</h1>
        <p className="mt-2 text-slate-600">
          This profile does not exist or is no longer available.
        </p>
        <Link
          className="mt-4 inline-block font-medium text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          to="/"
        >
          Return home
        </Link>
      </section>
    );
  }

  if (profileError) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6" role="alert">
        <h1 className="text-2xl font-bold text-slate-900">
          Unable to load profile
        </h1>
        <p className="mt-2 text-slate-600">{errorMessage(profileError)}</p>
        <button
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          onClick={() => setProfileRetry((retry) => retry + 1)}
          type="button"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-start sm:p-6">
        <Avatar
          avatar={safeAvatarUrl(profile.avatar) ? profile.avatar : ""}
          className="size-20"
          key={`${profile.username}:${profile.avatar ?? ""}`}
          username={profile.username}
        />
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-bold text-slate-900">
            {profile.username}
          </h1>
          <p className="mt-2 whitespace-pre-wrap break-words text-slate-700">
            {profile.bio || "No bio added."}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Joined {formatJoinedDate(profile.createdAt)}
          </p>
        </div>
      </section>

      {isOwnProfile && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">Edit profile</h2>
          <form className="mt-4 space-y-4" noValidate onSubmit={handleProfileUpdate}>
            <div>
              <label className="block text-sm font-medium text-slate-800" htmlFor="profile-bio">
                Bio
              </label>
              <textarea
                className={inputClass(Boolean(editErrors.bio))}
                id="profile-bio"
                maxLength={300}
                onChange={(event) => updateEditField("bio", event.target.value)}
                rows={4}
                value={editValues.bio}
              />
              <div className="mt-1 flex justify-between gap-3 text-xs text-slate-500">
                <span aria-live="polite">{editValues.bio.length}/300 characters</span>
                {editErrors.bio && (
                  <span className="text-right text-rose-700">{editErrors.bio}</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800" htmlFor="profile-avatar">
                Avatar URL
              </label>
              <input
                className={inputClass(Boolean(editErrors.avatar))}
                id="profile-avatar"
                maxLength={500}
                onChange={(event) => updateEditField("avatar", event.target.value)}
                type="url"
                value={editValues.avatar}
              />
              <div className="mt-1 flex justify-between gap-3 text-xs text-slate-500">
                <span aria-live="polite">{editValues.avatar.length}/500 characters</span>
                {editErrors.avatar && (
                  <span className="text-right text-rose-700">{editErrors.avatar}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Use an HTTP or HTTPS URL, or leave empty to clear your avatar.
              </p>
            </div>
            <button
              className="rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>
      )}

      <StatsCard stats={profile.stats} winRate={profile.winRate} />
      <BadgeList badges={profile.badges} />

      <section aria-labelledby="user-debates-heading">
        <h2 className="text-xl font-semibold text-slate-900" id="user-debates-heading">
          Debates
        </h2>
        <div
          aria-label="Debate list type"
          className="mt-3 flex flex-wrap gap-2 border-b border-slate-200"
          role="tablist"
        >
          {DEBATE_TYPES.map((debateType) => (
            <button
              aria-selected={type === debateType}
              className={`rounded-t-md border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                type === debateType
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              key={debateType}
              onClick={() => changeTab(debateType)}
              role="tab"
              type="button"
            >
              {TYPE_LABELS[debateType]}
            </button>
          ))}
        </div>

        {debatesError ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4" role="alert">
            <p className="text-sm text-rose-800">{errorMessage(debatesError)}</p>
            <button
              className="mt-3 rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-800 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
              onClick={() => setDebatesRetry((retry) => retry + 1)}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : debatesLoading ? (
          <Loader label="Loading debates..." />
        ) : debates.length > 0 ? (
          <>
            <ul className="mt-4 space-y-3">
              {debates.map((debate) => (
                <DebateItem debate={debate} key={debate.id} />
              ))}
            </ul>
            <nav
              aria-label="Debate pages"
              className="mt-4 flex items-center justify-between gap-3"
            >
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => changePage(page - 1)}
                type="button"
              >
                Previous
              </button>
              <span aria-live="polite" className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => changePage(page + 1)}
                type="button"
              >
                Next
              </button>
            </nav>
          </>
        ) : (
          <p className="mt-4 rounded-lg border border-slate-200 bg-white p-5 text-slate-600">
            No debates to show.
          </p>
        )}
      </section>
    </div>
  );
}
