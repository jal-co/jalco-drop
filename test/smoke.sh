#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
wait_for_rate_limit_window() { sleep 61; }
work="$(mktemp -d)"
export JALCO_DROP_TOKEN="smoke-token"
config=wrangler.local.jsonc
[[ -f "$config" ]] || config=wrangler.jsonc

target="${SMOKE_TARGET:-worker}"
port=8799
[[ "$target" == node ]] && port=8797
export JALCO_DROP_URL="http://localhost:$port"
if [[ "$target" == node ]]; then
  CHROME_PATH="${CHROME_PATH:-}" ADMIN_TOKEN="$JALCO_DROP_TOKEN" PORT="$port" DATA_DIR="$work/data" TEST_SCHEDULED=on OWNER_NAME="$(jq -r '.vars.OWNER_NAME' "$config")" CODE_THEME="$(jq -r '.vars.CODE_THEME' "$config")" node dist/server.mjs >"$work/wrangler.log" 2>&1 &
else
  npx wrangler dev --config "$config" --test-scheduled --port "$port" --host "localhost:$port" --var "ADMIN_TOKEN:$JALCO_DROP_TOKEN" --persist-to "$work/state" >"$work/wrangler.log" 2>&1 &
fi
server=$!
trap 'status=$?; pkill -P $server 2>/dev/null || true; kill $server 2>/dev/null; wait $server 2>/dev/null || true; rm -rf "$work"; exit $status' EXIT

for _ in $(seq 60); do
  curl -fsS "$JALCO_DROP_URL/style.css" >/dev/null 2>&1 && break
  sleep 0.5
done

passed=0
check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    passed=$((passed + 1))
    echo "ok   $label"
  else
    echo "FAIL $label: expected '$expected', got '$actual'" >&2
    cat "$work/wrangler.log" >&2
    exit 1
  fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
contains() { grep -qF -- "$1" && echo yes || echo no; }

check "home redirects away" "302 https://www.google.com/" "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$JALCO_DROP_URL/")"
check "fonts and styles are served" 200 "$(status "$JALCO_DROP_URL/style.css")"
check "upload without token is rejected" 401 "$(status -X POST -T README.md "$JALCO_DROP_URL/api/items")"

secret_url="$(printf 'the secret skill\n' | bin/jalco-drop -p hunter2 -n SKILL.md 2>/dev/null)"
slug="${secret_url##*/}"
check "locked drop asks for a password" 401 "$(status "$secret_url")"
check "locked raw is refused" 401 "$(status "$secret_url/SKILL.md")"
check "locked page does not leak content" no "$(curl -s "$secret_url" | contains 'the secret skill')"
check "wrong password is rejected" 401 "$(status -d password=nope "$secret_url")"
check "right password unlocks" 303 "$(status -c "$work/viewer" -d password=hunter2 "$secret_url")"
check "unlocked page shows content" yes "$(curl -s -b "$work/viewer" "$secret_url" | contains 'the secret skill')"
check "unlocked raw is plain text" "text/plain; charset=utf-8" "$(curl -s -o /dev/null -w '%{content_type}' -b "$work/viewer" "$secret_url/SKILL.md")"
check "unlock cookie does not open other drops" 401 "$(status -b "$work/viewer" "$(printf 'other\n' | bin/jalco-drop -p x 2>/dev/null)")"

mkdir -p "$work/my-skill"
printf -- '---\nname: my-skill\n---\n' >"$work/my-skill/SKILL.md"
zip_url="$(bin/jalco-drop -s my-skill "$work/my-skill" 2>/dev/null)"
check "directory uploads to the chosen slug" "$JALCO_DROP_URL/my-skill" "$zip_url"
check "zip downloads as an attachment" yes "$(curl -s -D - -o "$work/out.zip" "$zip_url/my-skill.zip?download=1" | contains "attachment; filename*=UTF-8''my-skill.zip")"
check "raw needs the real filename" 404 "$(status "$zip_url/other.zip")"
check "zip round-trips" "my-skill/SKILL.md" "$(unzip -Z1 "$work/out.zip" | grep SKILL.md)"
share_page="$(curl -s "$zip_url")"
check "zip opens as a share page" yes "$(contains 'sent you' <<<"$share_page")"
check "share page lists files" yes "$(contains '>SKILL.md</span>' <<<"$share_page")"
check "zip entry previews" yes "$(curl -s "$zip_url?entry=my-skill/SKILL.md" | contains 'name')"
check "zip entry raw extracts" yes "$(curl -s "$zip_url/my-skill.zip?entry=my-skill/SKILL.md" | contains 'name: my-skill')"
check "unknown zip entry is refused" 404 "$(status "$zip_url?entry=../secret")"
mkdir -p "$work/demo.scrawl/frames"
printf 'fake video' >"$work/demo.scrawl/recording.mp4"
cp public/favicon.png "$work/demo.scrawl/contact-sheet.png"
cp public/favicon.png "$work/demo.scrawl/frames/frame-01.png"
printf '{"video":"recording.mp4","durationMs":4000,"target":{"app":"Helium","windowTitle":"Demo"},"keyframes":[{"index":1,"t":1500,"file":"frames/frame-01.png","said":"look here"}],"windows":[{"title":"private window"}]}' >"$work/demo.scrawl/scrawl.json"
scrawl_url="$(bin/jalco-drop "$work/demo.scrawl" 2>/dev/null)"
scrawl_page="$(curl -s "$scrawl_url")"
check "scrawl opens with its video" yes "$(contains 'recording.mp4' <<<"$scrawl_page")"
check "scrawl lists its moments" yes "$(contains 'look here' <<<"$scrawl_page")"
check "scrawl upload drops window titles" no "$(curl -s "$scrawl_url/demo.zip?entry=demo%2Fscrawl.json" | contains 'private window')"
check "scrawl link preview plays its video" yes "$(contains 'property="og:video" content="'"$scrawl_url"'/demo.zip?entry=demo%2Frecording.mp4"' <<<"$scrawl_page")"
check "link preview is titled with the file name" yes "$(contains '<meta property="og:title" content="demo.zip"' <<<"$scrawl_page")"
check "scrawl video seeks by range" 206 "$(status -H 'Range: bytes=0-3' "$scrawl_url/demo.zip?entry=demo%2Frecording.mp4")"
check "scrawl expires by default" true "$(curl -s -H "Authorization: Bearer $JALCO_DROP_TOKEN" "$JALCO_DROP_URL/api/items" | jq -r '.[] | select(.name == "demo.zip") | .expires != null')"

video_url="$(printf 'fake mp4 bytes' | bin/jalco-drop -n clip.mp4 2>/dev/null)"
check "video drop plays in the page" yes "$(curl -s "$video_url" | contains 'class="stage-video"')"
check "video drop has a playable link preview" yes "$(curl -s "$video_url" | contains '<meta property="og:video:type" content="video/mp4"')"
check "video drop seeks by range" 206 "$(status -H 'Range: bytes=0-3' "$video_url/clip.mp4")"
check "locked drop has no link preview" no "$(curl -s "$secret_url" | contains 'og:')"

printf 'name,notes\nalpha,"comma, inside"\n' >"$work/data.csv"
csv_url="$(bin/jalco-drop "$work/data.csv" 2>/dev/null)"
check "csv renders as a table" yes "$(curl -s "$csv_url" | contains 'comma, inside</td>')"
check "csv source view" yes "$(curl -s "$csv_url?view=source" | contains 'class="line"')"
printf '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' >"$work/logo.svg"
svg_url="$(bin/jalco-drop "$work/logo.svg" 2>/dev/null)"
check "svg renders as an image" yes "$(curl -s "$svg_url" | contains 'logo.svg?render=1')"
check "rendered svg is sandboxed" yes "$(curl -sI "$svg_url/logo.svg?render=1" | contains 'content-security-policy: sandbox')"
printf 'ID3fake' >"$work/song.mp3"
mp3_url="$(bin/jalco-drop "$work/song.mp3" 2>/dev/null)"
check "audio plays in the page" yes "$(curl -s "$mp3_url" | contains '<audio')"
check "audio seeks by range" 206 "$(status -H 'Range: bytes=0-1' "$mp3_url/song.mp3")"
printf 'defmodule Hi do\nend\n' >"$work/hi.ex"
check "more languages are highlighted" yes "$(curl -s "$(bin/jalco-drop "$work/hi.ex" 2>/dev/null)" | contains 'class="shiki')"

check "taken slug is refused" 1 "$(bin/jalco-drop -s my-skill README.md >/dev/null 2>&1; echo $?)"

xss_url="$(printf '<script>alert(1)</script>' | bin/jalco-drop 2>/dev/null)"
check "pasted html is escaped" no "$(curl -s "$xss_url" | contains '<script>alert')"

md_url="$(printf '# Title\n\n<script>alert(1)</script>\n' | bin/jalco-drop -n notes.md 2>/dev/null)"
check "markdown renders" yes "$(curl -s "$md_url" | contains '<h1>Title</h1>')"
check "markdown html is escaped" no "$(curl -s "$md_url" | contains '<script>alert')"
fm_url="$(printf -- '---\nname: demo\ndescription: >-\n  folded\n  text\n---\n# Body\n' | bin/jalco-drop -n fm.md 2>/dev/null)"
check "frontmatter renders as properties" yes "$(curl -s "$fm_url" | contains '<dt>description</dt><dd>folded text</dd>')"
check "markdown source view" yes "$(curl -s "$md_url?view=source" | contains 'class="line"')"

html_url="$(printf '<h1>hi</h1>' | bin/jalco-drop -n page.html 2>/dev/null)"
check "html renders in a sandboxed frame" yes "$(curl -s "$html_url" | contains 'sandbox="allow-scripts')"
check "rendered html is sandboxed" yes "$(curl -sI "$html_url/page.html?render=1" | contains 'content-security-policy: sandbox allow-scripts')"
check "raw html stays plain text" yes "$(curl -sI "$html_url/page.html" | contains 'text/plain')"

code_url="$(printf 'const a = 1;\nconst b = "two";\n' | bin/jalco-drop -n snippet.ts 2>/dev/null)"
code_page="$(curl -s "$code_url")"
check "code is highlighted with the configured theme" yes "$(contains "class=\"shiki $(jq -r '.vars.CODE_THEME' "$config")\"" <<<"$code_page")"
check "file type icon is shown" yes "$(contains 'data-slot="file-icon"' <<<"$code_page")"
check "lines are linkable" yes "$(contains 'id="L2"' <<<"$code_page")"
check "line count excludes trailing newline" no "$(contains 'id="L3"' <<<"$code_page")"

expired_url="$(printf 'gone\n' | bin/jalco-drop -e 0h 2>/dev/null)"
check "expired drop is gone" 404 "$(status "$expired_url")"
printf 'old\n' | bin/jalco-drop -e 0h -s reused >/dev/null 2>&1
check "expired slug can be reused" "$JALCO_DROP_URL/reused" "$(printf 'new\n' | bin/jalco-drop -s reused 2>/dev/null)"
printf 'swept\n' | bin/jalco-drop -e 0h -s swept >/dev/null 2>&1
stored() {
  if [[ "${STORAGE:-disk}" == s3 ]]; then curl -s "$S3_ENDPOINT/$S3_BUCKET?list-type=2&prefix=$1" | grep -o "<Key>$1</Key>" | grep -c . || true
  elif [[ "$target" == node ]]; then ls "$work/data" | grep -cx "$1" || true
  else sqlite3 "$(ls "$work"/state/v3/r2/miniflare-R2BucketObject/*.sqlite | grep -v metadata)" "select count(*) from _mf_objects where key = '$1'"; fi
}
check "expired drop waits for cleanup" 1 "$(stored swept)"
curl -s "$JALCO_DROP_URL/__scheduled?cron=0+*+*+*+*" >/dev/null
check "hourly cleanup deletes expired drops" 0 "$(stored swept)"

wait_for_rate_limit_window
check "admin page asks to sign in" yes "$(curl -s "$JALCO_DROP_URL/admin" | contains 'Admin token')"
check "wrong admin token is rejected" 401 "$(status -d token=nope "$JALCO_DROP_URL/admin/login")"
check "admin login" 303 "$(status -c "$work/admin" -d "token=$JALCO_DROP_TOKEN" "$JALCO_DROP_URL/admin/login")"
check "admin lists drops" yes "$(curl -s -b "$work/admin" "$JALCO_DROP_URL/admin" | contains "/$slug")"
check "admin opens locked drops" 200 "$(status -b "$work/admin" "$secret_url")"
check "admin form upload" 303 "$(status -b "$work/admin" -H "Origin: $JALCO_DROP_URL" -F text=hello -F slug=from-form "$JALCO_DROP_URL/api/items")"
check "cross-site form post is refused" 401 "$(status -b "$work/admin" -H "Origin: https://evil.example" -F text=x "$JALCO_DROP_URL/api/items")"

bin/jalco-drop -d my-skill >/dev/null
check "deleted drop is gone" 404 "$(status "$zip_url")"

wait_for_rate_limit_window
settings() { curl -s -o /dev/null -w '%{http_code}' -b "$work/admin" -H "Origin: $JALCO_DROP_URL" "$@" "$JALCO_DROP_URL/admin/settings"; }
check "settings save" 303 "$(settings -d name=Smoke%20Drop -d owner=Robin -d accent=%2312ab34 -d theme=vesper -d home=https://example.com/)"
check "settings apply without a redeploy" yes "$(curl -s "$JALCO_DROP_URL/nope" | contains 'Smoke Drop')"
check "accent applies" yes "$(curl -s "$JALCO_DROP_URL/nope" | contains '--marker:#12ab34')"
check "home redirect applies" "https://example.com/" "$(curl -s -o /dev/null -w '%{redirect_url}' "$JALCO_DROP_URL/")"
check "invalid settings are refused" 400 "$(settings -d name=x -d owner=y -d accent=red -d theme=vesper -d home=https://example.com/)"
check "settings need the admin session" 401 "$(curl -s -o /dev/null -w '%{http_code}' -H "Origin: $JALCO_DROP_URL" -d name=x "$JALCO_DROP_URL/admin/settings")"
check "settings show every code theme" yes "$(curl -s -b "$work/admin" "$JALCO_DROP_URL/admin?tab=settings" | contains 'shiki nord')"
check "settings reset" 303 "$(curl -s -o /dev/null -w '%{http_code}' -b "$work/admin" -H "Origin: $JALCO_DROP_URL" -X POST "$JALCO_DROP_URL/admin/settings/reset")"
check "reset restores deploy values" no "$(curl -s "$JALCO_DROP_URL/nope" | contains 'Smoke Drop')"
new_token() { curl -s -b "$work/admin" -H "Origin: $JALCO_DROP_URL" "$@" "$JALCO_DROP_URL/admin/tokens" | grep -o 'jd_[A-Za-z0-9_-]*' | head -1; }
bot_token="$(new_token -F name=Grokbot -F "sender=Justin’s Grokbot" -F permissions=upload -F "avatar=@public/favicon.png;type=image/png")"
check "admin can create a token" yes "$(contains jd_ <<<"$bot_token")"
check "token creation needs the admin session" 401 "$(status -H "Origin: $JALCO_DROP_URL" -F name=x -F permissions=upload "$JALCO_DROP_URL/admin/tokens")"
check "tokens tab lists the token" yes "$(curl -s -b "$work/admin" "$JALCO_DROP_URL/admin?tab=tokens" | contains 'shows as Justin’s Grokbot')"
check "tokens tab never shows the secret again" no "$(curl -s -b "$work/admin" "$JALCO_DROP_URL/admin?tab=tokens" | contains "$bot_token")"
bot_url="$(printf 'from the bot\n' | JALCO_DROP_TOKEN="$bot_token" bin/jalco-drop -n bot.md 2>/dev/null)"
check "grokbot can upload" yes "$(contains "$JALCO_DROP_URL/" <<<"$bot_url")"
check "grokbot uploads show the badge" yes "$(curl -s "$bot_url" | contains 'aria-label="Uploaded by Grokbot"')"
bot_zip_url="$(JALCO_DROP_TOKEN="$bot_token" bin/jalco-drop "$work/my-skill" 2>/dev/null)"
check "grokbot zips say who sent them" yes "$(curl -s "$bot_zip_url" | contains '>Justin’s Grokbot</span>')"
check "admin uploads have no badge" no "$(curl -s "$code_url" | contains 'Uploaded by Grokbot')"
check "grokbot cannot list drops" 401 "$(status -H "Authorization: Bearer $bot_token" "$JALCO_DROP_URL/api/items")"
check "grokbot cannot delete drops" 401 "$(status -X DELETE -H "Authorization: Bearer $bot_token" "$JALCO_DROP_URL/api/items/${bot_url##*/}")"
avatar_src="$(curl -s "$bot_url" | grep -o '/avatars/[0-9a-f]*' | head -1)"
check "uploader avatar is served" "200 image/png" "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$JALCO_DROP_URL$avatar_src")"
list_token="$(new_token -F name=Lister -F permissions=list)"
check "a list token can list" 200 "$(status -H "Authorization: Bearer $list_token" "$JALCO_DROP_URL/api/items")"
check "a list token cannot upload" 401 "$(printf x | curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $list_token" --data-binary @- "$JALCO_DROP_URL/api/items?name=x.txt")"
bot_id="$(curl -s -b "$work/admin" "$JALCO_DROP_URL/admin?tab=tokens" | grep -o '&quot;id&quot;:&quot;[0-9a-f]\{64\}' | tail -1 | grep -o '[0-9a-f]\{64\}$')"
check "revoking a token" 303 "$(status -b "$work/admin" -H "Origin: $JALCO_DROP_URL" -X POST "$JALCO_DROP_URL/admin/tokens/$bot_id/revoke")"
check "a revoked token cannot upload" 401 "$(printf x | curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $bot_token" --data-binary @- "$JALCO_DROP_URL/api/items?name=x.txt")"
check "drops keep their sender after revoke" yes "$(curl -s "$bot_zip_url" | contains '>Justin’s Grokbot</span>')"
if [[ "$target" == worker || -n "${CHROME_PATH:-}" ]]; then
check "drop pages have a preview card" yes "$(curl -s "$bot_url" | contains 'property="og:image:width" content="1200"')"
check "preview card renders" "200 image/png" "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$bot_url?card=1")"
fi
check "card page needs a signed token" 401 "$(status "$bot_url?card-frame=forged&until=99999999999999")"
check "locked drops have no card" 401 "$(status "$secret_url?card=1")"

codes="$(for _ in $(seq 70); do status "$JALCO_DROP_URL/guess-$RANDOM"; echo; done)"
check "slug guessing is rate limited" yes "$(contains 429 <<<"$codes")"

echo "$passed checks passed"
