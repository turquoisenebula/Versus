import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you requested does not exist.</p>
      <Link className="mt-4 inline-block font-medium text-indigo-700 hover:underline" to="/">
        Return home
      </Link>
    </section>
  );
}
