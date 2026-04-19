# CRAVE — AWS infra (CLI-oriented)

This tree mirrors [docs/aws.md](../../docs/aws.md). Use that document as the source of truth for deploy order, IAM, S3 layout, API Gateway routes, and verification.

## One-command deploy (from repo `.env`)

From the **repository root** (with AWS credentials + Supabase vars in `.env`):

```bash
./infra/aws/scripts/deploy-aws-from-env.sh
```

This runs **`bootstrap.sh`** (S3 buckets, IAM role, `infra/aws/.generated/bootstrap.env`), renders **`policies/crave-lambda-inline.template.json`** into **`CraveBedrockAndS3`**, zips and **creates/updates** Lambdas **`crave-receipt-ocr`**, **`crave-bedrock-proxy`**, **`crave-ad-generate`**, **`crave-b2b-chat`**, wires **S3 → receipt-ocr**, and creates/updates HTTP API **`crave-http`** with routes **`POST /receipts/signed-url`** (S3 presigned PUT for receipt capture; **`crave-bedrock-proxy`**), **`POST /voice/place-order`**, **`POST /voice/resolve-group`**, **`POST /voice/recommend`**, **`POST /voice/confirm-booking`**, **`POST /v1/chat/completions`**, **`POST /v1/responses`** (OpenAI shims for ElevenLabs Custom LLM → Bedrock), **`POST /bedrock/converse`**, **`POST /b2b/chat`** (B2B dashboard multimodal chat → Bedrock), **`POST /ads/generate`**. Flags: `--skip-iam`, `--skip-lambdas`, `--skip-api`, `--skip-s3`.

**`.env` keys used:** `AWS_*`, optional `CRAVE_TEAM_SLUG`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, optional **`RECEIPTS_BUCKET`** (override; otherwise deploy sets **`RECEIPTS_BUCKET`** on **`crave-bedrock-proxy`** from **`CRAVE_RECEIPTS_BUCKET`** in **`bootstrap.env`**), `INTERNAL_HMAC_SECRET` or `CRAVE_INTERNAL_SECRET`, `MATCH_RECEIPT_EDGE_URL`, optional per-function Edge overrides **`PLACE_ORDER_URL`**, **`RESOLVE_GROUP_URL`**, **`RECOMMEND_URL`**, **`CONFIRM_BOOKING_URL`** (defaults: `{SUPABASE_URL}/functions/v1/{name}`), optional `RECEIPT_PARSE_MODEL_ID` (otherwise receipt OCR uses **`USE_STUB=true`**), **`BEDROCK_TEXT_MODEL_ID`** / **`AD_IMAGE_MODEL_ID`** for **`POST /ads/generate`** (Converse + Nova image; see `lambdas/ad-generate`), optional **`ELEVENLABS_CUSTOM_LLM_SECRET`** for **`POST /v1/chat/completions`** and **`POST /v1/responses`** (Custom LLM URL must include **`/v1/…`**), **`B2B_CHAT_SECRET`** and optional **`B2B_CHAT_MODEL_ID`** for **`POST /b2b/chat`** (defaults to **`BEDROCK_TEXT_MODEL_ID`** when unset).

Outputs: **`infra/aws/.generated/http-api-endpoint.txt`** (API Gateway base URL), rendered IAM + notification JSON (gitignored).

## Layout

| Path | Purpose |
|------|---------|
| `policies/lambda-trust.json` | Lambda execution role trust (docs/aws.md §4.1) |
| `policies/crave-lambda-inline.example.json` | Copy to `crave-lambda-inline.json`, substitute `ACCOUNT_ID` and bucket names (§4.3) |
| `scripts/bootstrap.sh` | Idempotent buckets + encryption + public access block + IAM role shell (§5, §4.2) |
| `notifications.example.json` | S3 → Lambda wiring template (§7.2); replace `REGION` / `ACCOUNT_ID` / function name |
| `receipts-cors.example.json` | Optional CORS on receipts bucket (§5.5) |
| `events/test-s3-receipt-event.example.json` | Sample payload for `aws lambda invoke` (§13) |
| `lambdas/receipt-ocr/` | S3 trigger → Bedrock vision → Supabase REST → `match-receipt-items` Edge (§6.1) |
| `lambdas/bedrock-proxy/` | HTTP API fan-out: `/voice/*` → Supabase Edge; **`/v1/chat/completions`** + **`/v1/responses`** (OpenAI shims for ElevenLabs Custom LLM); `/bedrock/converse` (§6.2) |
| `lambdas/b2b-chat/` | **`POST /b2b/chat`** — B2B dashboard multimodal chat → Bedrock Converse (§6.3) |
| `lambdas/ad-generate/` | **`POST /ads/generate`** — 3 Instagram-style designs (caption + hashtags + ≤3 PNGs each) via Bedrock (§6.4) |

## Workshop / shared accounts (docs/aws.md §0.1)

Set **`CRAVE_TEAM_SLUG`** when running `bootstrap.sh` so bucket names stay unique:

```bash
export CRAVE_TEAM_SLUG=hh26-your-team
./scripts/bootstrap.sh
```

### `receipt-ocr` Lambda environment (docs/aws.md §6.1)

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_URL` | yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | REST writes to `receipt_captures` / `receipt_line_items` |
| `RECEIPT_PARSE_MODEL_ID` | if not `USE_STUB` | Bedrock model id for vision |
| `MATCH_RECEIPT_EDGE_URL` | optional | `https://<ref>.supabase.co/functions/v1/match-receipt-items` |
| `INTERNAL_HMAC_SECRET` | if matcher used | Same value as Edge `CRAVE_INTERNAL_SECRET` |
| `USE_STUB` | optional | Set to `true` to skip Bedrock (demo JSON) |

## Secret names (Lambda ↔ Supabase Edge)

| docs/aws.md (Lambda env) | Supabase Edge secret | Header |
|--------------------------|----------------------|--------|
| `INTERNAL_HMAC_SECRET` | `CRAVE_INTERNAL_SECRET` for `match-receipt-items` | `x-crave-internal-secret` |

Use **one random string** in both places. `receipt-ocr` also accepts legacy **`CRAVE_INTERNAL_SECRET`** on Lambda if `INTERNAL_HMAC_SECRET` is unset.

### `bedrock-proxy` Lambda environment (docs/aws.md §6.2)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_ANON_KEY` | `apikey` header when invoking Edge |
| `PLACE_ORDER_URL`, `RESOLVE_GROUP_URL`, `RECOMMEND_URL`, `CONFIRM_BOOKING_URL` | Full Supabase Edge URLs (deploy derives each from `SUPABASE_URL` when omitted) |
| `BEDROCK_TEXT_MODEL_ID` | Optional; enables `POST .../bedrock/converse` |

### `ad-generate` Lambda environment

| Variable | Purpose |
|----------|---------|
| `BEDROCK_TEXT_MODEL_ID` | Converse model for creative JSON **and** per-slide **layout tree** (flexbox JSON for Satori; same Sonnet-class id recommended) |
| `AD_IMAGE_MODEL_ID` | Hero image: **`amazon.nova-canvas-v1:0`** (default) or a **Stability SD3.5** model / inference profile id if your account grants it |
| `AD_NOVA_QUALITY` | `premium` or `standard` (Nova only) |
| `AD_IMAGE_ASPECT_RATIO` | e.g. `4:5` for Instagram portrait (Stability text-to-image only) |
| `AD_OVERLAY_WITH_SVG` | `true` (default): Sonnet returns a **flexbox JSON** tree; **Satori + resvg** raster the overlay; Sharp composites hero + overlay + optional logo |
| `AD_OVERLAY_RENDERER` | `satori` (default) — reserved for future renderers |
| `AD_BUNDLE_CJK_FONT` | `true` to bundle Noto Sans SC at zip time (optional CJK coverage) |
| `AD_MAX_SLIDES_PER_DESIGN` | `1`–`3` (default `3`); lower if you must stay under HTTP API **~30s** |
| `AD_LOGO_IMAGE_INDEX` | `0`-based index into request `images[]` for logo; **`-1`** = last image (food first, logo last) |
| `ASSETS_BUCKET` | PNGs uploaded here; API returns **presigned GET** URLs (keeps responses under Lambda/API size limits) |

**Latency:** HTTP API → Lambda integrations are capped at **~30s**. Prefer the **Lambda function URL** (see deploy script output `ad-generate-function-url.txt`) for long runs. This function runs hero images **in parallel**, then overlays (default concurrency 5; optional JSON field `concurrency` 1–6). If you still hit timeouts on API Gateway, set **`AD_MAX_SLIDES_PER_DESIGN`** lower or reduce `concurrency`.

## Build zips (hackathon)

From each function directory:

```bash
npm install && zip -r function.zip . -x '*.git*' -x 'function.zip'
```

Runtime: **Node.js 20.x** (docs/aws.md §6).
