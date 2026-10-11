const relativeTime = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

const intervals = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

export function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "Date unavailable";
  }

  const difference = Math.round((timestamp - Date.now()) / 1000);
  const [unit, seconds] =
    intervals.find(([, intervalSeconds]) => Math.abs(difference) >= intervalSeconds) ??
    intervals[intervals.length - 1];

  return relativeTime.format(Math.round(difference / seconds), unit);
}

export function formatAbsoluteDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default formatAbsoluteDate;
