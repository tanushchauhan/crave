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
