const choices = [
  { value: "for", label: "For", style: "border-emerald-200 text-emerald-800 hover:bg-emerald-50", selected: "bg-emerald-600 text-white" },
  { value: "against", label: "Against", style: "border-rose-200 text-rose-800 hover:bg-rose-50", selected: "bg-rose-600 text-white" },
  { value: "neutral", label: "Neutral", style: "border-slate-300 text-slate-800 hover:bg-slate-100", selected: "bg-slate-700 text-white" },
];

export default function VoteButtons({
  myVote,
  disabled,
  pending,
  onVote,
  onRemove,
}) {
  return (
    <div>
      <div aria-label="Choose your vote" className="flex flex-wrap gap-2" role="group">
        {choices.map(({ value, label, style, selected }) => (
          <button
            aria-pressed={myVote === value}
            className={`min-h-11 flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 ${myVote === value ? selected : `bg-white ${style}`}`}
            disabled={disabled || pending || myVote === value}
            key={value}
            onClick={() => onVote(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {pending && (
        <p aria-live="polite" className="mt-2 text-sm text-slate-600" role="status">
          Saving your vote...
        </p>
      )}
      {myVote && (
        <button
          className="mt-3 min-h-10 rounded-md px-2 text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || pending}
          onClick={onRemove}
          type="button"
        >
          Remove my vote
        </button>
      )}
    </div>
  );
}
