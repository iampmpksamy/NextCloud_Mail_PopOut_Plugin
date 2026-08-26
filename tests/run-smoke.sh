#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

for file in $(find "$APP_DIR" -type f -name '*.php' | sort); do
	php -l "$file" >/dev/null
done

node --check "$APP_DIR/js/mail-popout.js"

if command -v xmllint >/dev/null 2>&1; then
	xmllint --noout "$APP_DIR/appinfo/info.xml" "$APP_DIR/img/app.svg"
fi

grep -q '<id>mail_popout</id>' "$APP_DIR/appinfo/info.xml"
grep -q 'BeforeTemplateRenderedEvent' "$APP_DIR/lib/AppInfo/Application.php"
grep -q 'floating-composer, .message-composer' "$APP_DIR/js/mail-popout.js"
grep -q 'mail-popout-popup-body' "$APP_DIR/css/mail-popout.css"

echo "Mail Pop-out smoke tests passed"
