# Brightpaths volunteer portal

A portal for Brightpaths staff, volunteers, and interns. It covers applications, interests, shifts, hours, alerts, and messages inside the portal.

This is separate from the Brightpaths website.

## Run it locally

Requires Node.js 22.13 or newer.

Create `.env.local` in this folder. It is not stored in GitHub.

```
DATABASE_URL=postgresql://...
SESSION_SECRET=a-long-random-string
```

`DATABASE_URL` is the Supabase pooler connection string (`pooler.supabase.com`). The direct database host does not connect from a host like Vercel. `SESSION_SECRET` signs the sign-in cookie. If it is missing, the app uses a fallback that is in the code, so set one before the site is public.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Records are in Supabase. They are not in a file in this folder.

## Handing it to Brightpaths

Brightpaths uses the website link. GitHub has the code and does not run the site. Supabase holds the records and does not run the website.

The Supabase project is on the free plan: $0 and 500 MB. If almost nobody uses the site for about a week, Supabase pauses the database. Opening that project and choosing Resume brings the records back. The free plan does not keep an automatic backup.

Put `DATABASE_URL` and `SESSION_SECRET` in the host’s settings (Vercel). Do not put them in GitHub. Do not put the Supabase service key in the site.

Staff do the rest from the menu:

- **Applications** reviews new people.
- **People** is the current list. **Upload a spreadsheet** adds people who already volunteer. Staff type one temporary password and tell those people. The site does not email it.
- **Events** and **Hours** are the calendar and the hour records. Hours are typed in by staff.
- **Messages** stay in the portal. They are not sent as email or texts.
- **Website** changes the homepage words and the ways to help.
- **Upkeep** adds a staff login and changes a password. Add at least two staff logins. A person can change only their own password, and there is no forgot-password link.

**Save a copy** on Upkeep writes a file on the computer running the site. On Vercel that file does not stay.

The background check stored here is a status (not started, pending, approved, or expired). The site does not keep the check itself, a home address, a birth date, or an ID number.

## Sample sign-in

These accounts are practice data. The password for each one is `pathway`. The sample box is hidden when `NODE_ENV` is production, and those emails cannot sign in there.

| Email | Who |
| --- | --- |
| staff@brightpaths.test | Staff dashboard |
| maya@brightpaths.test | Volunteer, childcare, background check approved |
| andre@brightpaths.test | Volunteer, big events, no background check |
| priya@brightpaths.test | Intern |
| luis@brightpaths.test | Alumni profile |
| hannah@brightpaths.test | New application |

The practice people, shifts, applications, hours, and messages should be removed in Supabase before real volunteers use the site. The portal has no delete button. Marking someone Inactive only hides them.
