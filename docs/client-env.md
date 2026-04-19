# CRAVE — client environment (mobile + dashboard)

Use these variables in **Expo (mobile)** and **Next.js (dashboard)**. Never put service-role keys, `B2B_CHAT_SECRET`, or `CRAVE_INTERNAL_SECRET` in client bundles.

## Supabase (both apps)

| Variable | Where | Notes |
|----------|--------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Client | `https://<project-ref>.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Publishable anon key |

Phone OTP and magic links: mirror the same redirect URLs in the **hosted** Supabase dashboard (Auth → URL configuration) as in local [supabase/config.toml](../supabase/config.toml) (`localhost:8081` for Expo, `localhost:3000` for Next).

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

1. **Postgres:** `supabase db push` (or MCP) so RPCs `match_receipt_lines_exact_and_trigram` / `match_receipt_line_embedding` and RLS policies exist.
2. **Edge:** `./scripts/supabase-deploy.sh` (sets `CRAVE_INTERNAL_SECRET`, `CRAVE_SERVICE_ROLE_KEY`, `CRAVE_AWS_API_BASE` on the project).
3. **AWS:** `./infra/aws/scripts/deploy-aws-from-env.sh` so `crave-bedrock-proxy` has `INTERNAL_HMAC_SECRET` (same value as `CRAVE_INTERNAL_SECRET`) and `POST /internal/embeddings/text` is registered; `MATCH_RECEIPT_EDGE_URL` on `crave-receipt-ocr` points at `…/functions/v1/match-receipt-items`.

`CRAVE_AWS_API_BASE` must match the **same** HTTP API host the mobile app uses (no `/` at end).
