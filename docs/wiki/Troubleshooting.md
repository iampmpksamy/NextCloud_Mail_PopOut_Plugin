# Troubleshooting

## The pop-out icon is missing

1. Confirm the app is enabled:

   ```bash
   sudo -u www-data php /var/www/nextcloud/occ app:list | grep -A 2 mail_popout
   ```

2. Confirm the directory is named exactly `mail_popout`.
3. Close the composer and hard-refresh Mail with `Ctrl+Shift+R` or `Cmd+Shift+R`.
4. Clear reverse-proxy or CDN caches.
5. Confirm these URLs return HTTP 200 on your Nextcloud domain:

   - `/custom_apps/mail_popout/js/mail-popout.js`
   - `/custom_apps/mail_popout/css/mail-popout.css`

## The separate window does not open

Allow pop-ups for the exact Nextcloud domain. When a popup is blocked, the composer remains usable as a draggable in-page window.

## A menu appears in the wrong window

Return the composer to Mail, hard-refresh the page, and detach it again. When reporting this problem, include the Nextcloud, Mail, browser, and Mail Pop-out versions and identify the affected menu.

## The app cannot be enabled

Check the supported versions on the [Compatibility](Compatibility) page, correct the app directory ownership, and inspect the Nextcloud log:

```bash
sudo -u www-data php /var/www/nextcloud/occ log:watch
```

For AIO:

```bash
docker exec --user www-data nextcloud-aio-nextcloud php occ log:watch
```

## Get help

- Email: [Maalig@pmpksamy.com](mailto:Maalig@pmpksamy.com)
- Website: https://pmpksamy.com
- Issues: https://github.com/iampmpksamy/NextCloud_Mail_PopOut_Plugin/issues
