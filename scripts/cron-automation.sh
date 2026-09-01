#!/usr/bin/env sh
# Trigger automation cron (review nudges, bounce-back, churn, campaign queue).
set -eu

BASE_URL="${BASE_URL:-http://localhost:3002}"
SECRET="${CRON_SECRET:-irewards-dev-cron}"

curl -s -X POST "$BASE_URL/api/cron/automation" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" | node -e "
  const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
  console.log('Churn queued:', d.churn?.queued ?? 0);
  console.log('Jobs processed:', d.jobs?.processed ?? 0, '/', d.jobs?.total ?? 0);
"
