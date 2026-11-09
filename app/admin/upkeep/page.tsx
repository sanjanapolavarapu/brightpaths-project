import Link from "next/link";
import { Flash, PageHeader } from "@/components/ui";
import { changeStaffPasswordAction, createBackupAction, createStaffAction } from "@/lib/actions/upkeep";
import { listBackups } from "@/lib/db";
import { listSampleAccounts, listStaff } from "@/lib/data";
import { queryValue } from "@/lib/format";

export const metadata = { title: "Upkeep" };

export default async function UpkeepPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const staff = await listStaff();
  const samples = await listSampleAccounts();
  const backups = listBackups();

  return (
    <div className="stack" id="content">
      <PageHeader title="Upkeep" />
      <Flash error={queryValue(params.error)} saved={queryValue(params.saved)} />
      {samples.length ? (
        <section className="banner warn">
          <strong>Sample accounts are still in this database.</strong>
          <p>
            They use the password pathway. Add a real staff login below before volunteers use the site. The sample
            people are {samples.map((person) => person.email).join(", ")}.
          </p>
        </section>
      ) : null}
      <section className="card stack">
        <h2>Staff logins</h2>
        <div className="list">
          {staff.map((person) => (
            <p key={person.id}>
              <strong>{person.name}</strong> <span className="muted">{person.email}</span>
            </p>
          ))}
        </div>
        <h3>Add a staff login</h3>
        <form className="stack" action={createStaffAction}>
          <div className="form-grid">
            <label className="field">
              <span>Name</span>
              <input name="name" required autoComplete="name" />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label className="field">
              <span>Phone, if you have one</span>
              <input name="phone" type="tel" autoComplete="tel" />
            </label>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Password</span>
              <input name="password" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            <label className="field">
              <span>Confirm password</span>
              <input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
            </label>
          </div>
          <p className="muted">Use a password they do not use anywhere else. At least 8 characters.</p>
          <button className="btn" type="submit">
            Add staff login
          </button>
        </form>
      </section>
      <section className="card stack">
        <h2>Your password</h2>
        <form className="stack" action={changeStaffPasswordAction}>
          <label className="field">
            <span>Current password</span>
            <input name="currentPassword" type="password" required autoComplete="current-password" />
          </label>
          <div className="form-grid">
            <label className="field">
              <span>New password</span>
              <input name="nextPassword" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            <label className="field">
              <span>Confirm new password</span>
              <input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
            </label>
          </div>
          <button className="btn" type="submit">
            Change password
          </button>
        </form>
      </section>
      <section className="card stack">
        <h2>A copy of the records</h2>
        <p>The file includes names, emails, phones, and password hashes. Keep it private.</p>
        <form action={createBackupAction}>
          <button className="btn" type="submit">
            Save a copy
          </button>
        </form>
        <div className="list">
          {backups.map((name) => (
            <Link className="row" key={name} href={`/admin/upkeep/download?file=${name}`}>
              <strong>{name}</strong>
              <div className="muted">Download this copy</div>
            </Link>
          ))}
          {!backups.length ? <p className="muted">No copies saved yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
