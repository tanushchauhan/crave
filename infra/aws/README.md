# CRAVE — AWS infra (CLI-oriented)

This tree mirrors [docs/aws.md](../../docs/aws.md). Use that document as the source of truth for deploy order, IAM, S3 layout, API Gateway routes, and verification.

## One-command deploy (from repo `.env`)

From the **repository root** (with AWS credentials + Supabase vars in `.env`):

```bash
./infra/aws/scripts/deploy-aws-from-env.sh
```

This runs **`bootstrap.sh`** (S3 buckets, IAM role, `infra/aws/.generated/bootstrap.env`), renders **`policies/crave-lambda-inline.template.json`** into **`CraveBedrockAndS3`**, zips and **creates/updates** Lambdas **`crave-receipt-ocr`**, **`crave-bedrock-proxy`**, **`crave-ad-generate`**, wires **S3 → receipt-ocr**, and creates/updates HTTP API **`crave-http`** with routes **`POST /voice/place-order`**, **`POST /bedrock/converse`**, **`POST /ads/generate`**. Flags: `--skip-iam`, `--skip-lambdas`, `--skip-api`, `--skip-s3`.

**`.env` keys used:** `AWS_*`, optional `CRAVE_TEAM_SLUG`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `INTERNAL_HMAC_SECRET` or `CRAVE_INTERNAL_SECRET`, `MATCH_RECEIPT_EDGE_URL`, `PLACE_ORDER_URL`, optional `RECEIPT_PARSE_MODEL_ID` (otherwise receipt OCR uses **`USE_STUB=true`**).

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
| `lambdas/bedrock-proxy/` | HTTP API fan-out: `/voice/place-order` → Supabase Edge `place-order`; Bedrock routes stub (§6.2) |
| `lambdas/ad-generate/` | Stub for `/ads/generate` → Bedrock + S3 (§6.3) |

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
| `PLACE_ORDER_URL` | Full Supabase Edge URL for `place-order` |
| `SUPABASE_ANON_KEY` | `apikey` header when invoking Edge |
| `BEDROCK_TEXT_MODEL_ID` | Optional; enables `POST .../bedrock/converse` |

## Build zips (hackathon)

From each function directory:

```bash
npm install && zip -r function.zip . -x '*.git*' -x 'function.zip'
```

Runtime: **Node.js 20.x** (docs/aws.md §6).
