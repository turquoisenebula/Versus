import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function getReturnTo(from) {
  if (
    from &&
    typeof from.pathname === "string" &&
    from.pathname.startsWith("/") &&
    !from.pathname.startsWith("//")
  ) {
    return {
      pathname: from.pathname,
      search: from.search ?? "",
      hash: from.hash ?? "",
    };
  }

  return "/";
}

export default function Login() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    const normalizedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: normalizedEmail, password });
      navigate(getReturnTo(location.state?.from), { replace: true });
    } catch (error) {
      toast.error(
        error.response?.data?.message ?? "Unable to log in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Log in</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            autoComplete="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            autoComplete="current-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
        </div>
        <button
          className="w-full rounded-md bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="mt-5 text-sm text-slate-600">
        New to Versus?{" "}
        <Link className="font-medium text-indigo-700 hover:underline" to="/register">
          Create an account
        </Link>
      </p>
    </section>
  );
}
