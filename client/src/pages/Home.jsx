import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listDebates } from "../api/debate.api";
import DebateCard from "../components/debate/DebateCard";
import Loader from "../components/common/Loader";
import useDebounce from "../hooks/useDebounce";
import { CATEGORIES, DEBATE_SORT_OPTIONS } from "../utils/constants";

const PAGE_SIZE = 10;

function getPage(value) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function isCanceled(error) {
  return error.code === "ERR_CANCELED";
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const urlSearch = searchParams.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput, 400);
  const syncingSearchFromUrl = useRef(false);
  const lastUrlSearch = useRef(urlSearch);
  const [debates, setDebates] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, totalPages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (urlSearch !== lastUrlSearch.current) {
      lastUrlSearch.current = urlSearch;
      syncingSearchFromUrl.current = true;
      setSearchInput(urlSearch);
    }
  }, [urlSearch]);

  useEffect(() => {
    if (syncingSearchFromUrl.current) {
      syncingSearchFromUrl.current = false;
      return;
    }

    const currentSearch = urlSearch;
    const nextSearch = debouncedSearch.trim();
    if (currentSearch === nextSearch) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    if (nextSearch) {
      nextParams.set("search", nextSearch);
    } else {
      nextParams.delete("search");
    }
    nextParams.set("page", "1");
    setSearchParams(nextParams);
  }, [debouncedSearch, searchParams, setSearchParams, urlSearch]);

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    const page = getPage(params.get("page"));
    const requestParams = { page, limit: PAGE_SIZE };
    const search = params.get("search")?.trim();
    const category = params.get("category");
    const status = params.get("status");
    const sort = params.get("sort");
    if (search) requestParams.search = search;
    if (CATEGORIES.includes(category)) requestParams.category = category;
    if (["open", "closed"].includes(status)) requestParams.status = status;
    if (DEBATE_SORT_OPTIONS.some((option) => option.value === sort)) {
      requestParams.sort = sort;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    listDebates(requestParams, { signal: controller.signal })
      .then((result) => {
        setDebates(result.debates);
        setPageInfo({
          page: result.page,
          totalPages: result.totalPages,
          total: result.total,
        });
      })
      .catch((requestError) => {
        if (!controller.signal.aborted && !isCanceled(requestError)) {
          setError(requestError);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [queryString, retryCount]);

  function updateFilters(updates) {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "all") {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
    });
    nextParams.set("page", "1");
    setSearchParams(nextParams);
  }

  function changePage(nextPage) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(nextPage));
    setSearchParams(nextParams);
  }

  const selectedCategory = searchParams.get("category");
  const selectedStatus = searchParams.get("status");
  const selectedSort = searchParams.get("sort");
  const currentCategory = CATEGORIES.includes(selectedCategory)
    ? selectedCategory
    : "all";
  const currentStatus = ["open", "closed"].includes(selectedStatus)
    ? selectedStatus
    : "all";
  const currentSort = DEBATE_SORT_OPTIONS.some(
    (option) => option.value === selectedSort,
  )
    ? selectedSort
    : "newest";
  const currentPage = getPage(searchParams.get("page"));
  const totalPages = Math.max(pageInfo.totalPages, 1);

  return (
    <section className="space-y-7">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
            Versus debate feed
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Explore debates
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Find a discussion, weigh both sides, and make your voice count.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          to="/debates/new"
        >
          Start a debate
        </Link>
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(140px,0.55fr))]">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="debate-search">
            Search debates
          </label>
          <input
            autoComplete="off"
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            id="debate-search"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search titles and descriptions"
            type="search"
            value={searchInput}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="debate-category">
            Category
          </label>
          <select
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            id="debate-category"
            onChange={(event) => updateFilters({ category: event.target.value })}
            value={currentCategory}
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="debate-status">
            Status
          </label>
          <select
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            id="debate-status"
            onChange={(event) => updateFilters({ status: event.target.value })}
            value={currentStatus}
          >
            <option value="all">All debates</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="debate-sort">
            Sort by
          </label>
          <select
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            id="debate-sort"
            onChange={(event) => updateFilters({ sort: event.target.value })}
            value={currentSort}
          >
            {DEBATE_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {loading ? "Loading debates..." : `${pageInfo.total} ${pageInfo.total === 1 ? "debate" : "debates"} found`}
        </p>
        {!loading && pageInfo.totalPages > 0 && (
          <p className="text-sm text-slate-500">
            Page {pageInfo.page} of {pageInfo.totalPages}
          </p>
        )}
      </div>

      {loading ? (
        <Loader label="Loading debates..." />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-white p-6 text-center" role="alert">
          <h2 className="font-semibold text-slate-900">We couldn't load the debates.</h2>
          <p className="mt-1 text-sm text-slate-600">
            {error.response?.data?.message ?? "Check your connection and try again."}
          </p>
          <button
            className="mt-4 min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setRetryCount((count) => count + 1)}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : debates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No debates found</h2>
          <p className="mt-2 text-sm text-slate-600">
            Try changing your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {debates.map((debate) => (
            <DebateCard debate={debate} key={debate._id} />
          ))}
        </div>
      )}

      {!loading && !error && pageInfo.totalPages > 0 && (
        <nav aria-label="Debate pages" className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <button
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage <= 1}
            onClick={() => changePage(currentPage - 1)}
            type="button"
          >
            Previous
          </button>
          <span aria-live="polite" className="text-sm text-slate-600">
            {pageInfo.page} / {totalPages}
          </span>
          <button
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage >= pageInfo.totalPages}
            onClick={() => changePage(currentPage + 1)}
            type="button"
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
