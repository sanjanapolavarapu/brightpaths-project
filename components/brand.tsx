export function Wordmark({ href = "/", onDark = false }: { href?: string; onDark?: boolean }) {
  return (
    <a className={onDark ? "wordmark on-dark" : "wordmark"} href={href}>
      <img className="logo" src="/brightpaths-logo.png" alt="Brightpaths" />
      <small>Volunteer portal</small>
    </a>
  );
}
