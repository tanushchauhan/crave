# Crave (Expo app)

React Native + Expo Router app inside the CRAVE monorepo (`crave-app/`).

## Setup

```bash
cd crave-app
npm install
```

Environment variables are read from the **monorepo root** `../.env*` (same precedence as Next.js: `.env.development.local` overrides `.env`, etc.). You do not need a separate `crave-app/.env` for shared keys.

For **phone OTP sign-in**, set at least **either** the `EXPO_PUBLIC_*` pair **or** the same values as `SUPABASE_URL` + `SUPABASE_ANON_KEY` in the repo root `.env` (they are copied into `extra` at build time via `app.config.js`).

- `EXPO_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`

See [docs/client-env.md](../docs/client-env.md) and hosted Supabase **Auth → Phone** (and redirect URLs for your dev client).

## Recommendations tab

The home tab loads venues via **`supabase.functions.invoke('recommend')`**, which calls RPC **`recommend_restaurants_for_user`** and returns menus. The app requests **foreground location** once per load (see **`expo-location`** and **`NSLocationWhenInUseUsageDescription`** in `app.json`); if the user grants access, the invoke body includes **`lat`** / **`lng`** so Edge can filter by radius (see [docs/supabase.md](../docs/supabase.md) §11). If permission is denied, recommendations still load without geo.

After **`supabase db push`**, redeploy Edge (`./scripts/supabase-deploy.sh` or `supabase functions deploy recommend`). Without seeded restaurants / embeddings, the list may be empty—use **`tools/supabase-seed`** (see [docs/supabase.md](../docs/supabase.md) §13).

## Groups tab

Groups load from Supabase **`dining_groups`** and **`group_members`** (signed-in user, RLS). Add member by **phone** uses E.164 normalization ([`lib/phone.ts`](lib/phone.ts)); the invitee must already have **`users.phone`** set to that value. Apply migrations **`20260422100000_group_invite_and_resolve_rpcs.sql`** and **`20260422101500_users_select_group_peers.sql`** then redeploy Edge if you use **`resolve-group`** (see [docs/supabase.md](../docs/supabase.md) §11).

## Reservations tab

The tab loads **`bookings`** with joins to **`restaurants`** and **`dining_groups`** ([`lib/bookingsApi.ts`](lib/bookingsApi.ts)); search and “current group” filtering are client-side. **Special instructions** map to **`dietary_notes`**; only the **booker** (`bookings.user_id = auth.uid()`) can update them (migration **`20260422140000_bookings_update_booker.sql`**). **Manage Reservations** opens a form that lists partner venues (`is_crave_partner`) and calls **`supabase.functions.invoke('confirm-booking', { body })`** with **`restaurant_id`**, **`party_size`**, and optional **`scheduled_at`**, **`group_id`** (current group when set), **`dietary_notes`**. Apply that migration, redeploy **`confirm-booking`**, and ensure the function has **`CRAVE_SERVICE_ROLE_KEY`** (see [docs/supabase.md](../docs/supabase.md) §11). Receipt uploads on the card remain local-only until the receipt pipeline is wired.

## iOS Simulator

```bash
npx expo run:ios -d "iPhone 16"
```

Use **Xcode → Open Developer Tool → Simulator** first if the CLI fails to focus the Simulator (some environments block `osascript` automation).

After the first successful `expo run:ios`, native folders `ios/` and `android/` are generated (gitignored here).

## Web

```bash
npx expo start --web
```

## Naming

- Package name: `crave-app`
- Expo slug: `crave-app`
- Deep link scheme: `crave://`
- Display name: **Crave**
