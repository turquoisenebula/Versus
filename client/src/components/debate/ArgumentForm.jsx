import { useState } from "react";

const MIN_LENGTH = 20;
const MAX_LENGTH = 1500;

export default function ArgumentForm({
  mySide,
  submitting,
  onSubmit,
}) {
  const [side, setSide] = useState(mySide || "for");
  const [text, setText] = useState("");
  const lockedSide = mySide || null;
  const isValid = text.trim().length >= MIN_LENGTH && text.trim().length <= MAX_LENGTH;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isValid || submitting) {
      return;
    }
    const posted = await onSubmit({ side: lockedSide || side, text: text.trim() });
    if (posted) {
      setText("");
    }
  }

  return (
    <form
      className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 sm:p-5"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">Add your argument</h3>
        {lockedSide ? (
          <p className="text-sm font-medium text-indigo-800">
            You are arguing {lockedSide === "for" ? "For" : "Against"}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="argument-side">
              Side
            </label>
            <select
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              id="argument-side"
              onChange={(event) => setSide(event.target.value)}
              value={side}
            >
              <option value="for">For</option>
              <option value="against">Against</option>
            </select>
          </div>
        )}
      </div>
      <label className="sr-only" htmlFor="argument-text">
        Your argument
      </label>
      <textarea
        className="mt-4 min-h-32 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        id="argument-text"
        maxLength={MAX_LENGTH}
        onChange={(event) => setText(event.target.value)}
        placeholder="Share a clear, thoughtful argument..."
        required
        value={text}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p
          className={`text-xs ${text.trim().length < MIN_LENGTH ? "text-amber-700" : "text-slate-500"}`}
          aria-live="polite"
        >
          {text.trim().length}/{MAX_LENGTH} characters (minimum {MIN_LENGTH})
        </p>
        <button
          className="min-h-11 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!isValid || submitting}
          type="submit"
        >
          {submitting ? "Posting..." : "Post argument"}
        </button>
      </div>
    </form>
  );
}
