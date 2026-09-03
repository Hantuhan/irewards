#!/usr/bin/env sh
# Wait until an HTTP URL responds (any status < 500).
set -eu
url="${1:?usage: wait-for-http.sh URL [max_seconds]}"
max="${2:-120}"
i=0
while [ "$i" -lt "$max" ]; do
  if curl -fsS -o /dev/null "$url" 2>/dev/null || curl -fsS -o /dev/null -w "%{http_code}" "$url" 2>/dev/null | grep -qE '^[23]'; then
    echo "OK $url"
    exit 0
  fi
  i=$((i + 1))
  sleep 2
done
echo "Timeout waiting for $url" >&2
exit 1
