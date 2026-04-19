#!/usr/bin/env bash
# CRAVE — One-shot AWS setup from repo .env (docs/aws.md §0, §4–§8, infra/aws/README.md).
# Prerequisites: AWS CLI v2, credentials in environment or .env; Node 18+ for npm zip builds.
#
# Usage:
#   source .env && ./infra/aws/scripts/deploy-aws-from-env.sh
#   ./infra/aws/scripts/deploy-aws-from-env.sh    # loads ../../.env automatically
#
# Flags:
#   --skip-iam       Skip inline IAM policy (if your org attaches policies elsewhere)
#   --skip-lambdas   Skip Lambda create/update
#   --skip-api       Skip API Gateway create/routes
#   --skip-s3        Skip S3 → receipt-ocr notification + permission
set -euo pipefail

SKIP_IAM=0
SKIP_LAMBDAS=0
SKIP_API=0
SKIP_S3=0
for a in "$@"; do
  case "$a" in
    --skip-iam) SKIP_IAM=1 ;;
    --skip-lambdas) SKIP_LAMBDAS=1 ;;
    --skip-api) SKIP_API=1 ;;
    --skip-s3) SKIP_S3=1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AWS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
POL="$AWS_ROOT/policies"
GEN="$AWS_ROOT/.generated"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  echo "Loaded: $ENV_FILE"
else
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

: "${AWS_REGION:=${AWS_DEFAULT_REGION:-us-east-1}}"
export AWS_REGION

command -v aws >/dev/null 2>&1 || {
  echo "aws CLI not found" >&2
  exit 1
}
command -v zip >/dev/null 2>&1 || {
  echo "zip not found" >&2
  exit 1
}

echo "== CRAVE AWS deploy-from-env =="
aws sts get-caller-identity

echo "== bootstrap (S3 + IAM role + generated bootstrap.env) =="
bash "$SCRIPT_DIR/bootstrap.sh"

# shellcheck disable=SC1090
source "${GEN}/bootstrap.env"

ACCOUNT_ID="$CRAVE_AWS_ACCOUNT_ID"
RECEIPTS_BUCKET="$CRAVE_RECEIPTS_BUCKET"
ASSETS_BUCKET="$CRAVE_ASSETS_BUCKET"

render_iam_policy() {
  sed \
    -e "s/__REGION__/${AWS_REGION}/g" \
    -e "s/__ACCOUNT_ID__/${ACCOUNT_ID}/g" \
    -e "s/__RECEIPTS_BUCKET__/${RECEIPTS_BUCKET}/g" \
    -e "s/__ASSETS_BUCKET__/${ASSETS_BUCKET}/g" \
    "$POL/crave-lambda-inline.template.json"
}

if [[ "$SKIP_IAM" -eq 0 ]]; then
  echo "== IAM inline policy (CraveBedrockAndS3) =="
  render_iam_policy >"$GEN/crave-lambda-inline.rendered.json"
  aws iam put-role-policy \
    --role-name crave-lambda-execution \
    --policy-name CraveBedrockAndS3 \
    --policy-document "file://${GEN}/crave-lambda-inline.rendered.json"
  echo "Waiting 10s for IAM policy propagation..."
  sleep 10
else
  echo "== skip IAM =="
fi

ROLE_ARN="$(aws iam get-role --role-name crave-lambda-execution --query 'Role.Arn' --output text)"
echo "ROLE_ARN=$ROLE_ARN"

zip_lambda() {
  local name="$1"
  local dir="$AWS_ROOT/lambdas/$name"
  [[ -d "$dir" ]] || {
    echo "Missing lambda dir $dir" >&2
    exit 1
  }
  echo "-- npm + zip: $name"
  (
    cd "$dir" || exit 1
    rm -f function.zip
    npm install --omit=dev --no-audit --no-fund
    if [[ "$name" == "ad-generate" ]]; then
      mkdir -p fonts
      echo "-- fonts for Satori overlay (Noto Sans; Lambda has no system fonts)"
      if [[ ! -s fonts/NotoSans-Regular.ttf ]]; then
        curl -fsSL -o fonts/NotoSans-Regular.ttf \
          "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf"
      fi
      if [[ ! -s fonts/NotoSans-Bold.ttf ]]; then
        curl -fsSL -o fonts/NotoSans-Bold.ttf \
          "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf"
      fi
      if [[ "${AD_BUNDLE_CJK_FONT:-false}" == "true" ]]; then
        if [[ ! -s fonts/NotoSansSC-Regular.otf ]]; then
          echo "-- bundling Noto Sans SC for CJK coverage (AD_BUNDLE_CJK_FONT=true)"
          curl -fsSL -o fonts/NotoSansSC-Regular.otf \
            "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf" || \
            echo "!! NotoSansSC fetch failed; continuing without CJK"
        fi
      fi
    fi
    # ad-generate uses sharp + @resvg/resvg-js: from macOS/Windows, force linux-x64 binaries for Lambda.
    if [[ "$name" == "ad-generate" ]] && [[ "$(uname -s)" != "Linux" ]]; then
      rm -rf node_modules/sharp node_modules/@resvg
      npm install --omit=dev --no-audit --no-fund --os=linux --cpu=x64 sharp @resvg/resvg-js
    fi
    zip -rq function.zip . -x '*.git*' -x '*.zip' -x '*.md'
  )
}

write_receipt_ocr_env() {
  python3 <<'PY'
import json, os, pathlib
gen = pathlib.Path(os.environ["GEN"])
stub = not (os.environ.get("RECEIPT_PARSE_MODEL_ID") or "").strip()
v = {
    "SUPABASE_URL": os.environ.get("SUPABASE_URL", ""),
    "SUPABASE_SERVICE_ROLE_KEY": os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
    "MATCH_RECEIPT_EDGE_URL": os.environ.get("MATCH_RECEIPT_EDGE_URL", ""),
}
hmac = (os.environ.get("INTERNAL_HMAC_SECRET") or os.environ.get("CRAVE_INTERNAL_SECRET") or "").strip()
if hmac:
    v["INTERNAL_HMAC_SECRET"] = hmac
mid = (os.environ.get("RECEIPT_PARSE_MODEL_ID") or "").strip()
if mid:
    v["RECEIPT_PARSE_MODEL_ID"] = mid
if stub or not mid:
    v["USE_STUB"] = "true"
out = {k: val for k, val in v.items() if val}
(gen / "lambda-env-receipt-ocr.json").write_text(json.dumps({"Variables": out}, indent=2))
PY
}

write_bedrock_proxy_env() {
  python3 <<'PY'
import json, os, pathlib
gen = pathlib.Path(os.environ["GEN"])
base = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")

def edge_fn(name):
    return f"{base}/functions/v1/{name}" if base else ""

v = {}
anon = (os.environ.get("SUPABASE_ANON_KEY") or "").strip()
if anon:
    v["SUPABASE_ANON_KEY"] = anon
mid = (os.environ.get("BEDROCK_TEXT_MODEL_ID") or "").strip()
if mid:
    v["BEDROCK_TEXT_MODEL_ID"] = mid
el = (os.environ.get("ELEVENLABS_CUSTOM_LLM_SECRET") or "").strip()
if el:
    v["ELEVENLABS_CUSTOM_LLM_SECRET"] = el

for env_key, fn_name in (
    ("PLACE_ORDER_URL", "place-order"),
    ("RESOLVE_GROUP_URL", "resolve-group"),
    ("RECOMMEND_URL", "recommend"),
    ("CONFIRM_BOOKING_URL", "confirm-booking"),
):
    explicit = (os.environ.get(env_key) or "").strip()
    v[env_key] = explicit or edge_fn(fn_name)

v = {k: val for k, val in v.items() if val}
if not v.get("SUPABASE_ANON_KEY"):
    v.setdefault("CRAVE_PROXY_READY", "1")
(gen / "lambda-env-bedrock-proxy.json").write_text(json.dumps({"Variables": v}, indent=2))
PY
}

write_ad_generate_env() {
  python3 <<'PY'
import json, os, pathlib
gen = pathlib.Path(os.environ["GEN"])
b = (os.environ.get("CRAVE_ASSETS_BUCKET") or "").strip()
v = {}
if b:
    v["ASSETS_BUCKET"] = b
else:
    v["CRAVE_AD_STUB"] = "1"
for k in (
    "BEDROCK_TEXT_MODEL_ID",
    "AD_IMAGE_MODEL_ID",
    "AD_IMAGE_PIXEL_SIZE",
    "AD_NOVA_QUALITY",
    "AD_IMAGE_ASPECT_RATIO",
    "AD_OVERLAY_WITH_SVG",
    "AD_OVERLAY_RENDERER",
    "AD_BUNDLE_CJK_FONT",
    "AD_LOGO_IMAGE_INDEX",
    "AD_MAX_SLIDES_PER_DESIGN",
):
    if (os.environ.get(k) or "").strip():
        v[k] = os.environ[k].strip()
(gen / "lambda-env-ad-generate.json").write_text(json.dumps({"Variables": v}, indent=2))
PY
}

upsert_lambda() {
  local fn_name="$1"
  local zip_path="$2"
  local handler="$3"
  local mem="$4"
  local timeout="$5"
  local env_file="$6"

  if aws lambda get-function --function-name "$fn_name" &>/dev/null; then
    echo "-- update-function-code: $fn_name"
    aws lambda update-function-code --function-name "$fn_name" --zip-file "fileb://${zip_path}"
    # wait for code update to finish
    aws lambda wait function-updated --function-name "$fn_name"
    echo "-- update-function-configuration: $fn_name"
    aws lambda update-function-configuration \
      --function-name "$fn_name" \
      --timeout "$timeout" \
      --memory-size "$mem" \
      --environment "file://${env_file}"
  else
    echo "-- create-function: $fn_name"
    aws lambda create-function \
      --function-name "$fn_name" \
      --runtime nodejs20.x \
      --role "$ROLE_ARN" \
      --handler "$handler" \
      --zip-file "fileb://${zip_path}" \
      --timeout "$timeout" \
      --memory-size "$mem" \
      --environment "file://${env_file}"
    aws lambda wait function-active --function-name "$fn_name"
  fi
}

export GEN="$GEN"
export CRAVE_ASSETS_BUCKET

if [[ "$SKIP_LAMBDAS" -eq 0 ]]; then
  mkdir -p "$GEN"
  export RECEIPT_PARSE_MODEL_ID="${RECEIPT_PARSE_MODEL_ID:-}"

  [[ -n "${SUPABASE_URL:-}" ]] || {
    echo "SUPABASE_URL is required in .env for Lambdas" >&2
    exit 1
  }
  [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] || {
    echo "SUPABASE_SERVICE_ROLE_KEY is required in .env for receipt-ocr" >&2
    exit 1
  }

  write_receipt_ocr_env
  write_bedrock_proxy_env
  write_ad_generate_env

  zip_lambda receipt-ocr
  zip_lambda bedrock-proxy
  zip_lambda ad-generate

  upsert_lambda crave-receipt-ocr "$AWS_ROOT/lambdas/receipt-ocr/function.zip" index.handler 1024 60 "$GEN/lambda-env-receipt-ocr.json"
  upsert_lambda crave-bedrock-proxy "$AWS_ROOT/lambdas/bedrock-proxy/function.zip" index.handler 512 30 "$GEN/lambda-env-bedrock-proxy.json"
  upsert_lambda crave-ad-generate "$AWS_ROOT/lambdas/ad-generate/function.zip" index.handler 1024 90 "$GEN/lambda-env-ad-generate.json"

  # Lambda function URL: HTTP API integrations are capped at 30s; function URL uses the Lambda timeout (e.g. 90s).
  echo "== Lambda function URL: crave-ad-generate =="
  cat >"$GEN/ad-generate-fnurl-cors.json" <<'FNURLCORS'
{
  "AllowCredentials": false,
  "AllowHeaders": ["authorization", "content-type"],
  "AllowMethods": ["*"],
  "AllowOrigins": ["*"],
  "MaxAge": 86400
}
FNURLCORS
  if aws lambda get-function-url-config --function-name crave-ad-generate --region "$AWS_REGION" &>/dev/null; then
    aws lambda update-function-url-config \
      --function-name crave-ad-generate \
      --region "$AWS_REGION" \
      --cors "file://${GEN}/ad-generate-fnurl-cors.json"
  else
    aws lambda create-function-url-config \
      --function-name crave-ad-generate \
      --region "$AWS_REGION" \
      --auth-type NONE \
      --cors "file://${GEN}/ad-generate-fnurl-cors.json"
  fi
  aws lambda get-function-url-config --function-name crave-ad-generate --region "$AWS_REGION" --query FunctionUrl --output text \
    >"$GEN/ad-generate-function-url.txt"
  echo "Wrote $GEN/ad-generate-function-url.txt"
  # Since Oct 2025, public function URLs need both InvokeFunctionUrl and InvokeFunction (via URL only).
  aws lambda remove-permission --function-name crave-ad-generate --region "$AWS_REGION" --statement-id AllowFnUrlPublicInvoke 2>/dev/null || true
  aws lambda remove-permission --function-name crave-ad-generate --region "$AWS_REGION" --statement-id AllowFnUrlInvokeFunction 2>/dev/null || true
  aws lambda add-permission \
    --function-name crave-ad-generate \
    --region "$AWS_REGION" \
    --statement-id AllowFnUrlPublicInvoke \
    --action lambda:InvokeFunctionUrl \
    --principal '*' \
    --function-url-auth-type NONE
  aws lambda add-permission \
    --function-name crave-ad-generate \
    --region "$AWS_REGION" \
    --statement-id AllowFnUrlInvokeFunction \
    --action lambda:InvokeFunction \
    --principal '*' \
    --invoked-via-function-url
else
  echo "== skip Lambdas =="
fi

RECEIPT_FN_ARN="$(aws lambda get-function --function-name crave-receipt-ocr --query 'Configuration.FunctionArn' --output text 2>/dev/null || true)"
PROXY_FN_ARN="$(aws lambda get-function --function-name crave-bedrock-proxy --query 'Configuration.FunctionArn' --output text 2>/dev/null || true)"

if [[ "$SKIP_S3" -eq 0 ]] && [[ -n "$RECEIPT_FN_ARN" && "$RECEIPT_FN_ARN" != "None" ]]; then
  echo "== S3 invoke permission + receipt notifications =="
  aws lambda remove-permission --function-name crave-receipt-ocr --statement-id s3invoke-receipts-crave 2>/dev/null || true
  aws lambda add-permission \
    --function-name crave-receipt-ocr \
    --statement-id s3invoke-receipts-crave \
    --principal s3.amazonaws.com \
    --action lambda:InvokeFunction \
    --source-arn "arn:aws:s3:::${RECEIPTS_BUCKET}"

  cat >"$GEN/notifications-receipts.json" <<EOF
{
  "LambdaFunctionConfigurations": [
    {
      "Id": "receipt-created",
      "LambdaFunctionArn": "${RECEIPT_FN_ARN}",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [{ "Name": "prefix", "Value": "receipts/" }]
        }
      }
    }
  ]
}
EOF
  aws s3api put-bucket-notification-configuration \
    --bucket "$RECEIPTS_BUCKET" \
    --notification-configuration "file://${GEN}/notifications-receipts.json"
else
  echo "== skip S3 (or receipt Lambda missing) =="
fi

if [[ "$SKIP_API" -eq 0 ]] && [[ -n "$PROXY_FN_ARN" && "$PROXY_FN_ARN" != "None" ]]; then
  echo "== HTTP API Gateway (crave-http) =="
  API_ID="$(aws apigatewayv2 get-apis --query "Items[?Name=='crave-http'].ApiId | [0]" --output text 2>/dev/null || true)"
  if [[ -z "$API_ID" || "$API_ID" == "None" ]]; then
    API_ID="$(aws apigatewayv2 create-api --name crave-http --protocol-type HTTP --query ApiId --output text)"
    echo "Created API_ID=$API_ID"
  else
    echo "Using existing API_ID=$API_ID"
  fi

  # Routes are not callable until an HTTP API stage exists (otherwise invoke URL returns 404).
  STAGE_COUNT="$(aws apigatewayv2 get-stages --api-id "$API_ID" --query 'length(Items)' --output text 2>/dev/null || echo 0)"
  if [[ "${STAGE_COUNT:-0}" == "0" || "${STAGE_COUNT}" == "None" ]]; then
    echo "Creating HTTP API \$default stage (auto-deploy)…"
    aws apigatewayv2 create-stage --api-id "$API_ID" --stage-name '$default' --auto-deploy
  fi

  find_integration_id() {
    local api_id="$1"
    local fn_arn="$2"
    aws apigatewayv2 get-integrations --api-id "$api_id" --output json |
      python3 -c "import json,sys; api,fn=sys.argv[1],sys.argv[2]; d=json.load(sys.stdin); \
print(next((i['IntegrationId'] for i in d.get('Items',[]) if fn in (i.get('IntegrationUri') or '')), ''))" "$api_id" "$fn_arn"
  }

  INT_ID="$(find_integration_id "$API_ID" "$PROXY_FN_ARN")"
  if [[ -z "$INT_ID" ]]; then
    INT_ID="$(aws apigatewayv2 create-integration \
      --api-id "$API_ID" \
      --integration-type AWS_PROXY \
      --integration-uri "$PROXY_FN_ARN" \
      --payload-format-version "2.0" \
      --integration-method POST \
      --query IntegrationId --output text)"
  fi
  echo "IntegrationId=$INT_ID"

  upsert_route() {
    local key="$1"
    local rid
    rid="$(aws apigatewayv2 get-routes --api-id "$API_ID" --output json |
      python3 -c "import json,sys; k=sys.argv[1]; d=json.load(sys.stdin); \
print(next((r['RouteId'] for r in d.get('Items',[]) if r.get('RouteKey')==k), ''))" "$key")"
    if [[ -n "$rid" ]]; then
      aws apigatewayv2 delete-route --api-id "$API_ID" --route-id "$rid" || true
    fi
    aws apigatewayv2 create-route \
      --api-id "$API_ID" \
      --route-key "$key" \
      --target "integrations/${INT_ID}"
  }

  upsert_route "POST /voice/place-order"
  upsert_route "POST /voice/resolve-group"
  upsert_route "POST /voice/recommend"
  upsert_route "POST /voice/confirm-booking"
  upsert_route "POST /v1/chat/completions"
  upsert_route "POST /bedrock/converse"

  AD_FN_ARN="$(aws lambda get-function --function-name crave-ad-generate --query 'Configuration.FunctionArn' --output text 2>/dev/null || true)"
  if [[ -n "$AD_FN_ARN" && "$AD_FN_ARN" != "None" ]]; then
    AD_INT="$(find_integration_id "$API_ID" "$AD_FN_ARN")"
    if [[ -z "$AD_INT" ]]; then
      AD_INT="$(aws apigatewayv2 create-integration \
        --api-id "$API_ID" \
        --integration-type AWS_PROXY \
        --integration-uri "$AD_FN_ARN" \
        --payload-format-version "2.0" \
        --integration-method POST \
        --query IntegrationId --output text)"
    fi
    rid="$(aws apigatewayv2 get-routes --api-id "$API_ID" --output json |
      python3 -c "import json,sys; d=json.load(sys.stdin); \
print(next((r['RouteId'] for r in d.get('Items',[]) if r.get('RouteKey')=='POST /ads/generate'), ''))")"
    if [[ -n "$rid" ]]; then
      aws apigatewayv2 delete-route --api-id "$API_ID" --route-id "$rid" || true
    fi
    aws apigatewayv2 create-route \
      --api-id "$API_ID" \
      --route-key "POST /ads/generate" \
      --target "integrations/${AD_INT}"
  fi

  cat >"$GEN/http-api-cors.json" <<'CORS'
{
  "AllowOrigins": [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8081"
  ],
  "AllowMethods": ["GET", "POST", "OPTIONS"],
  "AllowHeaders": ["authorization", "content-type", "apikey"]
}
CORS
  aws apigatewayv2 update-api --api-id "$API_ID" --cors-configuration "file://${GEN}/http-api-cors.json"

  INVOKE_URL="$(aws apigatewayv2 get-api --api-id "$API_ID" --query ApiEndpoint --output text)"
  echo "$INVOKE_URL" >"$GEN/http-api-endpoint.txt"

  # Allow API Gateway to invoke Lambdas
  for fname in crave-bedrock-proxy crave-ad-generate; do
    arn="$(aws lambda get-function --function-name "$fname" --query 'Configuration.FunctionArn' --output text 2>/dev/null || true)"
    [[ -z "$arn" || "$arn" == "None" ]] && continue
    aws lambda remove-permission --function-name "$fname" --statement-id "apigw-${API_ID}" 2>/dev/null || true
    aws lambda add-permission \
      --function-name "$fname" \
      --statement-id "apigw-${API_ID}" \
      --principal apigateway.amazonaws.com \
      --action lambda:InvokeFunction \
      --source-arn "arn:aws:execute-api:${AWS_REGION}:${ACCOUNT_ID}:${API_ID}/*/*"
  done

  echo "HTTP API base: $INVOKE_URL"
  echo "(saved to $GEN/http-api-endpoint.txt)"
else
  echo "== skip API Gateway =="
fi

echo "Done."
