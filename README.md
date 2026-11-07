# Brightpaths volunteer portal

A standalone portal for Brightpaths staff, volunteers, and interns. It covers applications, profile tags, event sign-up, hour tracking, short-staff alerts, and messages inside the portal.

This is separate from the Brightpaths website.

## Run it

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The database is created at `data/brightpaths.sqlite` the first time the app starts, with sample people and events. Delete that file and restart to load the sample data again.

## Handing it to Brightpaths

Brightpaths should use a website link. GitHub stores the code and does not run the site, and the records should not stay on a personal laptop.

The records are in a Supabase database, on the free plan. That plan is $0 and includes 500 MB. If almost nobody uses the site for a week, Supabase pauses the database. Opening the Supabase project and choosing Resume brings the records back. The free plan does not save a spare copy by itself. Staff can still use **Save a copy** on Upkeep and download that file.

Supabase holds the records. It does not run the website. Brightpaths uses the website link and does not open Supabase.

Staff do the rest in the menu. **Website** changes the public homepage and the ways to help. **Upkeep** adds another staff login, changes a password, and saves a private copy of the records.

## Sample sign-in

Password for every sample account: `pathway`

| Email | Who |
| --- | --- |
| staff@brightpaths.test | Staff dashboard |
| maya@brightpaths.test | Volunteer, childcare, background check approved |
| andre@brightpaths.test | Volunteer, big events, no background check |
| priya@brightpaths.test | Intern |
| luis@brightpaths.test | Alumni profile |
| hannah@brightpaths.test | New application |

Messages are delivered to inboxes in this portal. They are not sent through an outside email or phone service.
