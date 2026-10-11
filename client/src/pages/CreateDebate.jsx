import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { createDebate } from "../api/debate.api";
import { CATEGORIES } from "../utils/constants";

const FIELD_LIMITS = {
  title: { min: 10, max: 150 },
  description: { min: 20, max: 2000 },
};

function localDateTimeValue(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 19);
}

function validate(values, now = Date.now()) {
  const errors = {};
  const titleLength = values.title.trim().length;
  if (titleLength < FIELD_LIMITS.title.min) {
    errors.title = "Title must be at least 10 characters";
  } else if (titleLength > FIELD_LIMITS.title.max) {
    errors.title = "Title must be at most 150 characters";
  }

  if (values.description.length < FIELD_LIMITS.description.min) {
    errors.description = "Description must be at least 20 characters";
  } else if (values.description.length > FIELD_LIMITS.description.max) {
    errors.description = "Description must be at most 2000 characters";
  }

  if (!CATEGORIES.includes(values.category)) {
    errors.category = "Category is not supported";
  }

  const endTime = new Date(values.endsAt).getTime();
  if (!values.endsAt || !Number.isFinite(endTime)) {
    errors.endsAt = "End time must be a valid ISO date";
  } else if (endTime <= now) {
    errors.endsAt = "End time must be in the future";
  } else if (endTime > now + 30 * 24 * 60 * 60 * 1000) {
    errors.endsAt = "End time must be within 30 days";
  }

  return errors;
}

function fieldClass(hasError) {
  return `mt-1 w-full rounded-md border px-3 py-2 text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
    hasError ? "border-rose-500" : "border-slate-300"
  }`;
}

export default function CreateDebate() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    title: "",
    description: "",
    category: "",
    endsAt: "",
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const minEndTime = localDateTimeValue(new Date(clock + 999));
  const maxEndTime = localDateTimeValue(
    new Date(clock + 30 * 24 * 60 * 60 * 1000),
  );

  function changeField(field, value) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (submitted || errors[field]) {
      setErrors(validate(nextValues));
    }
  }

  function setQuickEndTime(days) {
    const endTime = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setClock(Date.now());
    changeField("endsAt", localDateTimeValue(endTime));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitted(true);
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const { debate } = await createDebate({
        title: values.title,
        description: values.description,
        category: values.category,
        endsAt: new Date(values.endsAt).toISOString(),
      });
      toast.success("Debate created");
      navigate(`/debates/${encodeURIComponent(debate._id)}`);
    } catch (error) {
      const message = error.response?.data?.message;
      if (typeof message === "string" && message) {
        toast.error(message);
      } else if (!error.response) {
        toast.error("Unable to create debate. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function errorFor(field) {
    return submitted || errors[field] ? errors[field] : "";
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Create Debate</h1>
      <p className="mt-2 text-slate-600">
        Set a topic and give the community time to make their case.
      </p>

      <form className="mt-6 space-y-5" noValidate onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-800" htmlFor="debate-title">
            Title
          </label>
          <input
            autoComplete="off"
            aria-describedby="title-error"
            aria-invalid={Boolean(errorFor("title"))}
            className={fieldClass(Boolean(errorFor("title")))}
            id="debate-title"
            maxLength={FIELD_LIMITS.title.max}
            minLength={FIELD_LIMITS.title.min}
            onBlur={() => setErrors(validate(values))}
            onChange={(event) => changeField("title", event.target.value)}
            required
            type="text"
            value={values.title}
          />
          <div className="mt-1 flex justify-between gap-3 text-xs text-slate-500">
            <span aria-live="polite">{values.title.trim().length}/150 characters</span>
            <span className="text-right text-rose-700" id="title-error">
              {errorFor("title")}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800" htmlFor="debate-description">
            Description
          </label>
          <textarea
            aria-describedby="description-error"
            aria-invalid={Boolean(errorFor("description"))}
            className={`${fieldClass(Boolean(errorFor("description")))} min-h-36 resize-y`}
            id="debate-description"
            maxLength={FIELD_LIMITS.description.max}
            minLength={FIELD_LIMITS.description.min}
            onBlur={() => setErrors(validate(values))}
            onChange={(event) => changeField("description", event.target.value)}
            required
            rows={6}
            value={values.description}
          />
          <div className="mt-1 flex justify-between gap-3 text-xs text-slate-500">
            <span aria-live="polite">{values.description.length}/2000 characters</span>
            <span className="text-right text-rose-700" id="description-error">
              {errorFor("description")}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800" htmlFor="debate-category">
            Category
          </label>
          <select
            aria-describedby="category-error"
            aria-invalid={Boolean(errorFor("category"))}
            className={fieldClass(Boolean(errorFor("category")))}
            id="debate-category"
            onBlur={() => setErrors(validate(values))}
            onChange={(event) => changeField("category", event.target.value)}
            required
            value={values.category}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category[0].toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-rose-700" id="category-error">
            {errorFor("category")}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800" htmlFor="debate-ends-at">
            End time
          </label>
          <input
            aria-describedby="ends-at-error"
            aria-invalid={Boolean(errorFor("endsAt"))}
            className={fieldClass(Boolean(errorFor("endsAt")))}
            id="debate-ends-at"
            max={maxEndTime}
            min={minEndTime}
            onBlur={() => setErrors(validate(values))}
            onChange={(event) => changeField("endsAt", event.target.value)}
            required
            step="1"
            type="datetime-local"
            value={values.endsAt}
          />
          <p className="mt-1 text-sm text-rose-700" id="ends-at-error">
            {errorFor("endsAt")}
          </p>
          <div aria-label="Quick end time options" className="mt-2 flex flex-wrap gap-2">
            {[1, 3, 7].map((days) => (
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                key={days}
                onClick={() => setQuickEndTime(days)}
                type="button"
              >
                {days} {days === 1 ? "day" : "days"}
              </button>
            ))}
          </div>
        </div>

        <button
          className="w-full rounded-md bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Creating..." : "Create debate"}
        </button>
      </form>
    </section>
  );
}
