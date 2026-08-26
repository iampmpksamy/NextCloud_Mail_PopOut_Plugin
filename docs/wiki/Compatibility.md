# Compatibility

## Supported software

| Component | Supported versions |
| --- | --- |
| Nextcloud | 32–35 |
| Nextcloud Mail | 5.10 and newer composer layouts |
| PHP | 8.1–8.5 |
| Browsers | Current Chromium, Firefox, and Safari releases |

Mail Pop-out recognizes both the modal composer used by Mail 5.10/5.11 and the newer floating composer layout.

## Browser requirements

- JavaScript must be enabled.
- Pop-ups must be allowed for separate-window mode.
- Browser local storage is used only to remember the last in-page composer position and size.

## Functional boundary

This plugin enhances Mail's existing composer. It does not replace Mail's message editor, sending API, draft storage, attachment storage, encryption, or account configuration. The installed Mail version controls the number of active composer sessions.
