export default function Loader({ label = "Loading..." }) {
  return (
    <div
      className="flex min-h-40 items-center justify-center gap-3 text-sm text-slate-600"
      role="status"
      aria-live="polite"
    >
      <span
        className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
