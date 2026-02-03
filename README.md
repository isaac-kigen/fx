# FX Signal Platform

Monorepo for FX signal + sizing + manual execution workflows.

## Structure

- `apps/web` — Next.js dashboard + push subscription UI
- `supabase/functions` — Edge Functions (ingest, validate, generate, notify)
- `supabase/migrations` — Postgres schema + RLS
- `packages/shared` — shared constants

## Env Vars

### Supabase Edge Functions

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TWELVE_DATA_API_KEY=
TWELVE_DATA_OUTPUTSIZE=10
VALIDATE_LOOKBACK=200
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
RESEND_API_KEY=
RESEND_FROM=
RESEND_TO=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
```

### Web (Next.js)

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

## Notes

- Edge functions assume bar-close scheduling with a buffer (H1 @ HH:02 UTC, H4 @ 00:02/04:02/... UTC).
- `generate-signals` uses H4 trend + H1 pullback confirmation and creates notification events.
- `notify` sends Telegram, email (Resend), and Web Push in parallel with retries.
- Supabase Auth is required for journaling and push subscriptions.
- Role model: `admin` and `trader` can access the dashboard. `viewer` is denied.

## Tests

```
pnpm test
```

## Production Readiness Checklist

- Apply migrations in `supabase/migrations`
- Configure cron schedules in `supabase/migrations/002_cron.sql`
- Populate `account_state` and `system_settings`
- Confirm Twelve Data API key and request limits
- Subscribe push from the dashboard
