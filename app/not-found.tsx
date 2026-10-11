import Link from "next/link";

export default function NotFound() {
  return (
    <main className="public-main" id="content">
      <h1>We couldn&apos;t find that page.</h1>
      <p style={{ marginTop: "0.8rem" }}>
        <Link href="/">Head back home</Link>
      </p>
    </main>
  );
}
