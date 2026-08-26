#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CHROME_BIN="${CHROME_BIN:-$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)}"
TEST_PORT="${TEST_PORT:-18765}"

if [[ -z "$CHROME_BIN" ]]; then
	echo "Chrome/Chromium is unavailable; browser smoke test skipped"
	exit 0
fi

server_log=$(mktemp)
browser_log=$(mktemp)
php -S "127.0.0.1:$TEST_PORT" -t "$APP_DIR" >"$server_log" 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true; rm -f "$server_log" "$browser_log"' EXIT

for _ in $(seq 1 30); do
	if curl -fsS "http://127.0.0.1:$TEST_PORT/tests/browser-fixture.html" >/dev/null 2>&1; then
		break
	fi
	sleep 0.1
done

"$CHROME_BIN" \
	--headless=new \
	--disable-gpu \
	--disable-popup-blocking \
	--no-sandbox \
	--virtual-time-budget=2500 \
	--dump-dom \
	"http://127.0.0.1:$TEST_PORT/tests/browser-fixture.html" >"$browser_log" 2>&1

if ! grep -q '<output id="test-result" data-complete="true">PASS</output>' "$browser_log"; then
	cat "$browser_log"
	exit 1
fi

echo "Mail Pop-out browser smoke test passed"
