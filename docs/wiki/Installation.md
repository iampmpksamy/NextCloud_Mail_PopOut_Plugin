# Installation

The plugin directory must be named exactly `mail_popout` and placed under Nextcloud's `custom_apps` directory. Nextcloud Mail must already be enabled.

## Requirements

- Nextcloud 32 through 35
- Nextcloud Mail 5.10 or newer
- PHP 8.1 through 8.5
- Administrator access

## Standard Nextcloud installation

```bash
cd /var/www/nextcloud/custom_apps
sudo -u www-data git clone \
  https://github.com/iampmpksamy/NextCloud_Mail_PopOut_Plugin.git \
  mail_popout
cd /var/www/nextcloud
sudo -u www-data php occ app:enable mail_popout
```

## Nextcloud AIO installation

Download or clone the repository into a local directory named `mail_popout`, then run:

```bash
docker exec nextcloud-aio-nextcloud \
  mkdir -p /var/www/html/custom_apps/mail_popout
docker cp mail_popout/. nextcloud-aio-nextcloud:/var/www/html/custom_apps/mail_popout/
docker exec nextcloud-aio-nextcloud \
  chown -R www-data:www-data /var/www/html/custom_apps/mail_popout
docker exec --user www-data nextcloud-aio-nextcloud \
  php occ app:enable mail_popout
```

## Verify

```bash
sudo -u www-data php /var/www/nextcloud/occ app:getpath mail_popout
```

For AIO:

```bash
docker exec --user www-data nextcloud-aio-nextcloud php occ app:getpath mail_popout
```

Close any composer that was already open, hard-refresh Mail with `Ctrl+Shift+R` or `Cmd+Shift+R`, and open a new message.

For ZIP installation, updating, disabling, and removal instructions, see the repository's [complete installation guide](https://github.com/iampmpksamy/NextCloud_Mail_PopOut_Plugin/blob/main/INSTALL.md).
