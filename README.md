# Hyrox Tracker

A single-user training tracker for HYROX doubles. Self-hosted on Vercel +
Supabase, installable on an iPhone as a PWA.

Built around one race: a 20-week plan generated from a template and a race
date, daily check-ins, set-by-set logging, Apple Health ingest, and a weekly
review that proposes plan changes you accept or reject.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind 4** + **shadcn/ui**
- **Supabase** — Postgres, magic-link auth, private Storage bucket
- **Recharts** for trends, **Motion** for transitions
- Row-level security on every table, scoped by `user_id`

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

### Environment

| Variable | Needed for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | everything | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | everything | `sb_publishable_…`, safe in the browser |
| `SUPABASE_SECRET_KEY` | ingest, cron | `sb_secret_…`, server only — bypasses RLS |
| `ALLOWED_EMAIL` | auth | The only address that can sign in |
| `NEXT_PUBLIC_SITE_URL` | auth | Optional. Pins the magic-link origin; otherwise resolved from Vercel or the request |
| `INGEST_TOKEN` | phase 2 | Bearer token for `POST /api/ingest` |
| `ANTHROPIC_API_KEY` | phase 4 | Weekly review |
| `CRON_SECRET` | phase 4 | Vercel sends this on cron requests |

### Database

Migrations live in `supabase/migrations`. Either link the CLI:

```bash
npm run db:link    # asks for your project ref and database password
npm run db:push
```

…or paste them into the Supabase SQL editor:

```bash
npm run db:sql | pbcopy
```

### Auth

Sign-in is a magic link, restricted to `ALLOWED_EMAIL`. Three layers:

1. The login action refuses to send a link to any other address.
2. `src/proxy.ts` signs out any session whose email doesn't match.
3. Row-level security scopes every row to `auth.uid()`.

Add `<origin>/auth/callback` to **Auth → URL Configuration → Redirect URLs**
in the Supabase dashboard, for both `http://localhost:3000` and your
deployed origin.

By default Supabase sends a PKCE `code`, which only works in the browser that
requested the link. To open the link on a different device, change the magic
link email template to point at:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

`/auth/callback` handles both.

## Apple Health sync

[Health Auto Export](https://apps.apple.com/app/health-auto-export/id1115567069)
pushes iPhone health data to `POST /api/ingest` on a schedule. The REST API
automation is a paid feature of that app.

### Set up the endpoint

Generate a token and put it in both places:

```bash
openssl rand -hex 32          # into INGEST_TOKEN, locally and on your host
```

Check it works before touching the phone:

```bash
curl -s https://YOUR-APP/api/ingest -H "Authorization: Bearer $INGEST_TOKEN"
# {"ok":true,"last_sync_at":null}
```

### Set up the phone

In Health Auto Export → **Automations** → **Add Automation**:

| Field | Value |
| --- | --- |
| Automation type | REST API |
| URL | `https://YOUR-APP/api/ingest` |
| Method | POST |
| Format | JSON |
| Header | `Authorization: Bearer <your token>` |
| Aggregate | Daily |

Metrics worth enabling — anything else is accepted and ignored, and comes
back in `ignored_metrics` so you can see what's being dropped:

`resting_heart_rate` · `heart_rate_variability` · `sleep_analysis` ·
`dietary_energy` · `protein` · `step_count`

Enable **Workouts** as well; runs are what the pace chart is built from.

An hourly schedule is plenty. Today's tab warns when the last sync is more
than 36 hours old.

### How it behaves

- **Idempotent.** Metrics key on `(user, date)`, workouts on
  `(user, start, type)`. The app re-sends overlapping windows constantly, so
  re-posting the same data changes nothing.
- **Partial syncs don't erase.** A payload carrying only steps won't blank
  that day's resting HR: existing rows are read, merged, and written back.
- **Units are converted.** kJ to kcal, miles to km, minutes to hours.
  Sleep counts time asleep, not time in bed.
- **Bad input degrades.** An unparseable metric is skipped rather than
  failing the whole request; a partial sync beats a rejected one.

## The training plan

`src/lib/plan/template.ts` holds the 20-week plan as data;
`src/lib/plan/generate.ts` turns it into dated rows in `plan_sessions`.

The grid is anchored to **race day**, not to the start date. Weeks 1-19 are
described by weekday, so Saturday long runs stay on Saturdays. The last eight
days are described by distance from the race, so the taper lands correctly no
matter which weekday you race on.

| Weeks | Phase | What changes |
| --- | --- | --- |
| 1-8 | Base | Easy runs Tuesday, full-body circuit Friday |
| 9-16 | Build | Tuesday becomes 1 km intervals, Friday becomes partner Hyrox |
| 17-18 | Peak | Full race simulation, then a half |
| 19 | Taper | Volume down ~30%, intensity unchanged |
| 20 | Race | Shakeout, light lift, 3 × 1 km, jog + strides, rest, race |

The plan is generated once on first sign-in and never overwrites a date that
already exists, so regenerating can't destroy logged work.

## Project layout

```
src/
  app/
    (app)/today|train|progress|review/   the four tabs
    login/  auth/                        magic link
  components/
    ios/                                 large titles, inset lists, tab bar, steppers
    ui/                                  shadcn
  lib/
    plan/      template, generator, set-row building
    supabase/  browser / server / admin clients, row types
    data/      bootstrap and queries
supabase/migrations/
```

## Licence

MIT.
