#!/usr/bin/env bash
# CRAVE — AWS bootstrap aligned with docs/aws.md §0, §4–§5 (requires AWS CLI v2 + credentials).
# Optional: CRAVE_TEAM_SLUG for shared workshop accounts (docs/aws.md §0.1) — unique bucket prefix.
set -euo pipefail

: "${AWS_REGION:=us-east-1}"
export AWS_REGION

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AWS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
POL="$AWS_ROOT/policies"

echo "== CRAVE AWS bootstrap (see docs/aws.md and infra/aws/README.md) =="
aws sts get-caller-identity

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
if [ -n "${CRAVE_TEAM_SLUG:-}" ]; then
  RECEIPTS_BUCKET="crave-${CRAVE_TEAM_SLUG}-receipts-${ACCOUNT_ID}"
  ASSETS_BUCKET="crave-${CRAVE_TEAM_SLUG}-assets-${ACCOUNT_ID}"
  echo "Using team-prefixed buckets (CRAVE_TEAM_SLUG=${CRAVE_TEAM_SLUG})"
else
  RECEIPTS_BUCKET="crave-receipts-${ACCOUNT_ID}"
  ASSETS_BUCKET="crave-assets-${ACCOUNT_ID}"
fi

echo "Creating buckets: ${RECEIPTS_BUCKET}, ${ASSETS_BUCKET}"
if aws s3api head-bucket --bucket "$RECEIPTS_BUCKET" 2>/dev/null; then
  echo "Receipts bucket exists"
else
  if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$RECEIPTS_BUCKET" --region "$AWS_REGION"
  else
    aws s3api create-bucket --bucket "$RECEIPTS_BUCKET" --region "$AWS_REGION" \
      --create-bucket-configuration "LocationConstraint=${AWS_REGION}"
  fi
fi

if aws s3api head-bucket --bucket "$ASSETS_BUCKET" 2>/dev/null; then
  echo "Assets bucket exists"
else
  if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$ASSETS_BUCKET" --region "$AWS_REGION"
  else
    aws s3api create-bucket --bucket "$ASSETS_BUCKET" --region "$AWS_REGION" \
      --create-bucket-configuration "LocationConstraint=${AWS_REGION}"
  fi
fi

for B in "$RECEIPTS_BUCKET" "$ASSETS_BUCKET"; do
  aws s3api put-public-access-block --bucket "$B" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  aws s3api put-bucket-encryption --bucket "$B" \
    --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
done

echo "Creating IAM role crave-lambda-execution (idempotent-ish)"
if aws iam get-role --role-name crave-lambda-execution >/dev/null 2>&1; then
  echo "Role already exists"
else
  aws iam create-role --role-name crave-lambda-execution \
    --assume-role-policy-document "file://${POL}/lambda-trust.json"
  aws iam attach-role-policy --role-name crave-lambda-execution \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
fi

echo "Next manual steps:"
echo "1) Copy ${POL}/crave-lambda-inline.example.json to crave-lambda-inline.json — set bucket ARNs to:"
echo "     ${RECEIPTS_BUCKET} and ${ASSETS_BUCKET} (replace ACCOUNT_ID=${ACCOUNT_ID} in ARNs if your template uses it)."
echo "   aws iam put-role-policy --role-name crave-lambda-execution --policy-name CraveBedrockAndS3 --policy-document file://..."
echo "2) Build Lambda zips (Node 20): receipt-ocr, bedrock-proxy, ad-generate — see infra/aws/README.md"
echo "3) aws lambda add-permission ... (S3 invoke) then attach notifications from notifications.example.json (docs/aws.md §7)."
echo "Export for shell / Lambda env:"
echo "  export RECEIPTS_BUCKET=${RECEIPTS_BUCKET}"
echo "  export ASSETS_BUCKET=${ASSETS_BUCKET}"
