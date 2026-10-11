import { Wordmark } from "./brand";

export function PublicHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-bar">
      <header className="public-header">
        <Wordmark />
        <nav className="nav-links">{children}</nav>
      </header>
    </div>
  );
}
