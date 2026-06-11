# SattaKingFast Next.js + MongoDB

This is a JavaScript Next.js rebuild of the old Laravel site.

## Stack

- Next.js App Router
- JavaScript
- MongoDB with Mongoose
- Existing public CSS/assets copied from the Laravel project
- Cookie-based admin login

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

3. Put your MongoDB connection string in `MONGODB_URI`.

4. If the MongoDB database still has data in the old `results` collection, migrate it into the current app collections:

```bash
npm run migrate:legacy-results -- --dry-run
npm run migrate:legacy-results
```

5. Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Admin

- Login URL: `/admin/login`
- If imported SQL includes users, use the imported admin email/password.
- If no user exists, the login page lets you create the first admin.

## A7 Result Sync

Sync the matched A7Satta games into today's MongoDB results:

```bash
npm run sync:a7
```

Preview changes without writing:

```bash
npm run sync:a7 -- --dry-run
```

Sync a specific date:

```bash
npm run sync:a7 -- --date 2026-05-21
```

Run the smart 2-hour result-window sync. This is the command to schedule every 5 minutes:

```bash
npm run sync:a7:smart
```

On Vercel or cron-job.org, the same smart sync runs from `/api/cron/sync-a7`.
Set `CRON_SECRET` in your environment variables to protect the cron endpoint.

For cron-job.org, use this URL format so the request is authorized:

```text
https://your-domain.com/api/cron/sync-a7?secret=YOUR_CRON_SECRET
```

The cron endpoint has a 30 second max duration, fetches A7 with a 12 second timeout, and revalidates the homepage after a successful sync.

Use a different active window if needed:

```bash
npm run sync:a7 -- --smart --window-minutes 10
```

## Deploy

Deploy the folder to Vercel and set:

- `MONGODB_URI`
- `SESSION_SECRET`
- `NEXT_PUBLIC_SITE_URL`
