# Tests

`run-smoke.sh` checks the PHP and JavaScript syntax, XML well-formedness when `xmllint` is installed, and the integration assets required for both supported Mail composer layouts.

`run-browser-smoke.sh` uses a local fixture and Chrome/Chromium to verify both composer layouts, accessible control injection, duplicate protection, and title-bar dragging. It skips cleanly when no compatible browser is installed.

The browser integration is intentionally tested against a running Nextcloud because the composer is provided by the installed Mail app. After the smoke test, verify these actions in Mail:

1. Open a new message and confirm the page is not covered by a dark modal backdrop.
2. Drag and resize the composer.
3. Detach it and use recipient fields, the rich-text editor, attachments, and Send in the separate browser window.
4. Return it using both the header icon and the parent-page **Return** button.
5. Close the browser window directly and confirm the composer returns without losing its fields.
6. Minimize and close the composer and confirm Mail saves or discards the draft using its normal prompts.
