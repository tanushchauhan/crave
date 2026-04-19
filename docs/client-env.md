# CRAVE — client environment (mobile + dashboard)

Use these variables in **Expo (mobile)** and **Next.js (B2B dashboard: [crave-b2b](../crave-b2b/))**. Never put service-role keys, `B2B_CHAT_SECRET`, or `CRAVE_INTERNAL_SECRET` in client bundles.

## Supabase (both apps)

| Variable | Where | Notes |
|----------|--------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Client | `https://<project-ref>.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Publishable anon key |

The root [`.env.example`](../.env.example) uses **`SUPABASE_URL`** and **`SUPABASE_ANON_KEY`** (CLI / Lambda). The **crave-b2b** app reads **`NEXT_PUBLIC_*`** in the browser. **[crave-b2b/next.config.ts](../crave-b2b/next.config.ts)** loads `.env*` from **both** the monorepo root and `crave-b2b/`, then copies `SUPABASE_*` → `NEXT_PUBLIC_*` when the latter are unset, and exposes them via `next.config` `env` so Turbopack and middleware see them. You can set either naming style in root `.env`.

### Supabase Auth — redirect URLs (hosted project)

In the Supabase dashboard (**Authentication → URL configuration**), add redirect URLs that match how users return after email confirmation or password recovery:

| App | Example redirect URL |
|-----|------------------------|
| **crave-b2b** (local) | `http://localhost:3000/auth/callback` |
| **crave-b2b** (production) | `https://<your-vercel-domain>/auth/callback` |

**Consumer (Expo):** phone OTP and magic links — mirror the same pattern in **Auth → URL configuration** as in local [supabase/config.toml](../supabase/config.toml) (e.g. `localhost:8081` for Expo).

**B2B (crave-b2b):** signup stores **`pending_restaurant_name`** in `auth.users` **`raw_user_meta_data`**; after the user confirms email (if required), **`GET /auth/callback`** exchanges the code for a session and calls Postgres RPC **`register_restaurant_on_signup`** (see [docs/supabase.md](supabase.md#69-b2b-ownership-no-separate-staff-table) and [§10](supabase.md#10-auth)). With email confirmation disabled, signup calls the RPC immediately in the browser.

## AWS HTTP API (mobile + dashboard)

| Variable | Where | Notes |
|----------|--------|--------|
| `EXPO_PUBLIC_CRAVE_API_BASE` / `NEXT_PUBLIC_CRAVE_API_BASE` | Client | API Gateway base, e.g. `https://<api-id>.execute-api.us-east-1.amazonaws.com` (no trailing slash). From deploy: `infra/aws/.generated/http-api-endpoint.txt`. |

**Receipt upload:** `POST ${CRAVE_API_BASE}/receipts/signed-url` with `Authorization: Bearer <Supabase access_token>` and JSON `{ "booking_id": "<uuid>" }`, then `PUT` the image to `put_url` with the returned `Content-Type` header.

**Voice tools (ElevenLabs):** point tool HTTP base at the same `${CRAVE_API_BASE}/voice/...` routes (see [docs/aws.md](aws.md) §8.2).

## B2B dashboard chat (Next.js server only)

Do **not** expose `B2B_CHAT_SECRET` to the browser. Call Bedrock from a **Route Handler** or **Server Action**:

- Server env: `B2B_CHAT_SECRET`, `CRAVE_B2B_CHAT_URL` = `https://<api-id>.execute-api.<region>.amazonaws.com/b2b/chat`
- `POST` with headers `Authorization: Bearer ${B2B_CHAT_SECRET}`, `Content-Type: application/json`, body per [infra/aws/lambdas/b2b-chat/index.mjs](../infra/aws/lambdas/b2b-chat/index.mjs) (OpenAI-style `messages`).

Example (App Router `app/api/b2b-chat/route.ts` — adjust imports for your tree):

```typescript
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const secret = process.env.B2B_CHAT_SECRET;
  const url = process.env.CRAVE_B2B_CHAT_URL;
  if (!secret || !url) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }
  const body = await req.json();
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
  });
}
```

## Deploy checklist

1. **Postgres:** `supabase db push` (or MCP) so RPCs `match_receipt_lines_exact_and_trigram` / `match_receipt_line_embedding`, **`register_restaurant_on_signup`** (B2B signup → `restaurants.owner_user_id`), and RLS policies exist.
2. **Edge:** `./scripts/supabase-deploy.sh` (sets `CRAVE_INTERNAL_SECRET`, `CRAVE_SERVICE_ROLE_KEY`, `CRAVE_AWS_API_BASE` on the project).
3. **AWS:** `./infra/aws/scripts/deploy-aws-from-env.sh` so `crave-bedrock-proxy` has `INTERNAL_HMAC_SECRET` (same value as `CRAVE_INTERNAL_SECRET`) and `POST /internal/embeddings/text` is registered; `MATCH_RECEIPT_EDGE_URL` on `crave-receipt-ocr` points at `…/functions/v1/match-receipt-items`.

`CRAVE_AWS_API_BASE` must match the **same** HTTP API host the mobile app uses (no `/` at end).
