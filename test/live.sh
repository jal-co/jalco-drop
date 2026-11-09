#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
config=wrangler.local.jsonc
[[ -f "$config" ]] || config=wrangler.jsonc
app="${LIVE_URL:-https://$(grep -o '"pattern": *"[^"]*"' "$config" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')}"
docs="${DOCS_URL:-https://drop.justinlevine.me}"
version="$(jq -r .version package.json)"
failed=0

check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "ok   $label"
  else
    echo "FAIL $label: expected '$expected', got '$actual'" >&2
    failed=1
  fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
generator() { curl -s "$1" | grep -o 'name="generator" content="[^"]*"' | sed 's/.*content="//; s/"$//'; }

echo "Waiting for $app to serve $version"
for _ in $(seq 36); do
  [[ "$(generator "$app/admin")" == "jalco-drop $version" ]] && break
  sleep 5
done

check "app serves $version" "jalco-drop $version" "$(generator "$app/admin")"
check "home redirects away" 302 "$(status "$app/")"
check "styles load" 200 "$(status "$app/style.css")"
check "unknown slugs are 404" 404 "$(status "$app/live-check-missing-$RANDOM")"
check "the API needs a token" 401 "$(status "$app/api/items")"
check "link preview bots are allowed" yes "$(curl -s "$app/robots.txt" | grep -q 'Twitterbot' && echo yes || echo no)"

if [[ -n "${JALCO_DROP_TOKEN:-}" ]]; then
  url="$(printf 'live check %s\n' "$version" | JALCO_DROP_URL="$app" bin/jalco-drop -n live-check.txt -e 1h 2>/dev/null)"
  check "uploads open" "live check $version" "$(curl -s "$url/live-check.txt")"
  JALCO_DROP_URL="$app" bin/jalco-drop -d "${url##*/}" >/dev/null 2>&1
  check "deletes take effect" 404 "$(status "$url")"
else
  echo "skip upload round trip (set JALCO_DROP_TOKEN to include it)"
fi

check "docs load" 200 "$(status "$docs/")"
check "docs changelog lists $version" yes "$(curl -s "$docs/changelog" | grep -qF "$version" && echo yes || echo no)"
check "docs OG card" "200 image/png" "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$docs/og/index.png")"
check "docs videos" 200 "$(status "$docs/videos/code.mp4")"

exit "$failed"
