# crave-b2b: Restaurant Dashboard

Next.js 16 dashboard for CRAVE partner restaurants: real-time bookings and orders feed,
menu management, KPI tracking, the "Ask Crave!" multimodal analytics chatbot, and the
AI Ad Campaign Studio. Part of the [CRAVE monorepo](../README.md).

## Getting Started

Environment variables are loaded from the **monorepo root** `../.env*` (after Next's default
`crave-b2b/.env*`, root values **override**). Put shared secrets in the repo root `.env`.
See [../.env.example](../.env.example) and [../docs/client-env.md](../docs/client-env.md).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You need at least `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or the `NEXT_PUBLIC_*` equivalents)
in the root `.env`. Without them every route throws
`Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY` and `/` returns HTTP 500.
`next.config.ts` copies `SUPABASE_*` → `NEXT_PUBLIC_*` when the latter are unset.

`/` redirects to `/login`; sign-in is Supabase Auth email/password. Apply the migrations in
[../supabase/migrations](../supabase/migrations) and register a restaurant account first.
See [../docs/supabase.md](../docs/supabase.md).

## Routes

| Path | Purpose |
|---|---|
| `/login`, `/signup`, `/forgot-password` | Supabase Auth (email/password); signup registers the restaurant |
| `/dashboard` | KPIs plus the live bookings + orders feed (Supabase Realtime) |
| `/dashboard/menu` | Menu management and per-item performance |
| `/dashboard/ask` | "Ask Crave!", multimodal analytics chat (text, images, PDFs) |
| `/dashboard/ad-campaign-studio` | One-prompt ad generation via the `ad-generate` Lambda |

API routes live under `app/api/` (`b2b-chat`, `ad-campaign/generate`, `dashboard/live-rows`,
`dashboard/menu-performance`) and proxy to Lambda so bearer secrets stay server-side.

## Watchpack / `EINTR` on macOS

If you see `Watchpack Error … EINTR` while watching paths under `~/Desktop`, run the dev server
with polling instead of native `FSEvents`:

```bash
WATCHPACK_POLLING=true npm run dev
```

Or try `npm run dev:webpack` (Webpack dev + the `watchOptions` in `next.config.ts`). The server
usually still works (`Ready`, `GET … 200`) even when those lines appear.
