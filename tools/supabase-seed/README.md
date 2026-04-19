# CRAVE Supabase demo seed

Populates the hosted Supabase project with real restaurants near UT Austin (OpenStreetMap Overpass, no API key), ten curated CRAVE partner venues with menus, demo users (**phone auth**), groups, bookings, orders, and item feedback. Generates **1536-dimensional** embeddings with **Amazon Bedrock Titan Embed Text** (`amazon.titan-embed-text-v1` by default).

## Why this folder

Dependencies install **only** under `tools/supabase-seed/node_modules`, not the monorepo root.

## Supabase Auth (required before first seed)

1. **Authentication → Providers → Phone** — enable Phone.
2. **Authentication → Providers → Phone → Test OTPs** — paste (comma-separated, no spaces around `=`):

```text
18005550101=123456,18005550102=123456,18005550103=123456,18005550104=123456,18005550105=123456,18005550106=123456,18005550107=123456,18005550108=123456,18005550109=123456,18005550110=123456
```

Numbers `18005550101`–`18005550108` match the eight rows in `data/demo-users.json`. **`18005550109` and `18005550110`** are spare lines for manual sign-up tests in the app (same OTP `123456`).

3. In the app, sign in with **E.164** `+18005550101`, …, `+18005550108` and OTP **`123456`** (Supabase does not send a real SMS for listed test numbers).

The seed uses **`auth.admin.createUser({ phone, phone_confirm: true })`** so rows exist without going through the OTP UI; the test list still applies when those users sign in from the client.

## Prerequisites

- Node 20+
- Repo-root `.env` (or `.env` in this folder) with:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (and `AWS_SESSION_TOKEN` if using temporary credentials)
  - `BEDROCK_EMBEDDING_TEXT_MODEL_ID` (optional; defaults to `amazon.titan-embed-text-v1`)

## Commands

```bash
cd tools/supabase-seed
npm install
npm run seed
```

- `npm run seed:reset` — deletes rows in seeded tables and **auth users whose phone is in `demo-users.json`** (or `crave_seed` metadata), then re-seeds. **Destructive** on shared dev DBs.
- `npm run seed:no-embeddings` — skips Bedrock calls; leaves `embedding` / `pref_embedding` null.

## Idempotency

Restaurant rows are keyed by `google_place_id` (`osm:…` or `curated:slug`). Bookings, orders, and feedback use deterministic UUIDv5 ids so re-running updates the same rows.

## Partner B2B owner

**Alex** (`alex-owner`, phone **`+18005550101`**) is `owner_user_id` on all ten curated partner restaurants. Sign in as that user (phone + test OTP) to exercise dashboard and owner-scoped RPCs.
