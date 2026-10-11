import { useState } from "react";

function safeAvatarUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

export default function Avatar({ avatar, username, className = "size-9" }) {
  const [failed, setFailed] = useState(false);
  const canShowImage = safeAvatarUrl(avatar) && !failed;
  const initials = (username || "?").slice(0, 2).toUpperCase();

  if (canShowImage) {
    return (
      <img
        alt={`${username || "User"} avatar`}
        className={`${className} shrink-0 rounded-full object-cover`}
        onError={() => setFailed(true)}
        src={avatar}
      />
    );
  }

  return (
    <span
      aria-label={`${username || "User"} initials`}
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700`}
    >
      {initials}
    </span>
  );
}
