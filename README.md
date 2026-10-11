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
