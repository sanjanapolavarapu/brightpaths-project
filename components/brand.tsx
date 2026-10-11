export function Mark({ size = 32, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={onDark ? "#faaf42" : "#1076bb"} />
      <path
        d="M6 22c4-1 6-6 10-6s6 5 10 4"
        fill="none"
        stroke={onDark ? "#0e446f" : "#faaf42"}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="23" cy="10" r="3" fill={onDark ? "#0e446f" : "#faaf42"} />
    </svg>
  );
}

export function Wordmark({ href = "/", onDark = false }: { href?: string; onDark?: boolean }) {
  return (
    <a className="wordmark" href={href}>
      <Mark onDark={onDark} />
      <span>
        <strong>Brightpaths</strong>
        <small>Volunteer portal</small>
      </span>
    </a>
  );
}
