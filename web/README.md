This project is a Next.js app under the `web/` directory.

## Working With This Repo

- Dev server (run from `web/`):
	- `npm run dev`
- After you change files, commit and push to trigger Vercel:
	- `cd /Users/jack/Desktop/Avengers`
	- `git status -sb`
	- `git add <files>`
	- `git commit -m "<message>"`
	- `git push origin main`
- Common paths to edit:
	- App pages: `src/app` (e.g., `src/app/page.tsx`)
	- API routes: `src/app/api`
	- Lib/logic: `src/lib`
	- Components: `src/components`
- Cron config lives at `web/vercel.json` (used by Vercel cron jobs).

## Environment

Set these in `.env.local` (and in Vercel env vars):
- `FINNHUB_API_KEY` and `NEXT_PUBLIC_FINNHUB_API_KEY`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`

## Deploy

Vercel builds from the `web/` root with `npm run build` and picks up `web/vercel.json` for cron jobs. Push to `main` to deploy.
