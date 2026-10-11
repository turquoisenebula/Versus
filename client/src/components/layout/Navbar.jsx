import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6"
      >
        <Link className="text-xl font-bold tracking-tight text-indigo-700" to="/">
          Versus
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
          <Link
            className="font-medium text-slate-700 hover:text-indigo-700"
            to="/debates/new"
          >
            Create Debate
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                className="font-medium text-slate-700 hover:text-indigo-700"
                to={`/u/${encodeURIComponent(user.username)}`}
              >
                {user.username}
              </Link>
              <button
                className="font-medium text-slate-700 hover:text-indigo-700"
                onClick={logout}
                type="button"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                className="font-medium text-slate-700 hover:text-indigo-700"
                to="/login"
              >
                Login
              </Link>
              <Link
                className="rounded-md bg-indigo-600 px-3 py-2 font-medium text-white hover:bg-indigo-700"
                to="/register"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
