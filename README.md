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
