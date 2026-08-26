# Mail Pop-out installation guide

Mail Pop-out must be installed in a directory named exactly `mail_popout` under Nextcloud's `custom_apps` directory. The Nextcloud Mail app must already be installed and enabled.

## Requirements

- Nextcloud 32, 33, 34, or 35
- Nextcloud Mail 5.10 or newer
- PHP 8.1 through 8.5
- Administrator access to the Nextcloud server
- A current Chromium, Firefox, or Safari browser

Back up the Nextcloud application directory and configuration before changing a production installation.

## Option 1: Install with Git

Replace `/var/www/nextcloud` if Nextcloud is installed elsewhere:

```bash
cd /var/www/nextcloud/custom_apps
sudo -u www-data git clone \
  https://github.com/iampmpksamy/NextCloud_Mail_PopOut_Plugin.git \
  mail_popout
cd /var/www/nextcloud
sudo -u www-data php occ app:enable mail_popout
```

## Option 2: Install a downloaded ZIP

Download the repository ZIP from GitHub and extract it:

```bash
cd /tmp
curl -L \
  https://github.com/iampmpksamy/NextCloud_Mail_PopOut_Plugin/archive/refs/heads/main.zip \
  -o mail_popout.zip
unzip mail_popout.zip
sudo mv NextCloud_Mail_PopOut_Plugin-main /var/www/nextcloud/custom_apps/mail_popout
sudo chown -R www-data:www-data /var/www/nextcloud/custom_apps/mail_popout
cd /var/www/nextcloud
sudo -u www-data php occ app:enable mail_popout
```

The extracted directory must be renamed to `mail_popout`. A directory named `NextCloud_Mail_PopOut_Plugin-main` will not be recognized as this app.

## Option 3: Nextcloud AIO or Docker

Download and extract the repository on the Docker host first. The following commands assume the Nextcloud container is named `nextcloud-aio-nextcloud`:

```bash
docker exec nextcloud-aio-nextcloud \
  mkdir -p /var/www/html/custom_apps/mail_popout
docker cp mail_popout/. nextcloud-aio-nextcloud:/var/www/html/custom_apps/mail_popout/
docker exec nextcloud-aio-nextcloud \
  chown -R www-data:www-data /var/www/html/custom_apps/mail_popout
docker exec --user www-data nextcloud-aio-nextcloud \
  php occ app:enable mail_popout
```

For a non-AIO deployment, replace `nextcloud-aio-nextcloud` with the name of the container running Nextcloud.

## Verify the installation

For a standard installation:

```bash
cd /var/www/nextcloud
sudo -u www-data php occ app:list | grep -A 2 mail_popout
sudo -u www-data php occ app:getpath mail_popout
```

For Nextcloud AIO:

```bash
docker exec --user www-data nextcloud-aio-nextcloud php occ app:list | grep -A 2 mail_popout
docker exec --user www-data nextcloud-aio-nextcloud php occ app:getpath mail_popout
```

The app should be listed under enabled apps, and its path should end in `/custom_apps/mail_popout`.

## Confirm the composer button

1. Close any Mail composer that was already open.
2. Hard-refresh the Mail page with `Ctrl+Shift+R` or `Cmd+Shift+R`.
3. Start a new message, reply, forward, or open a draft.
4. Confirm that the dark modal backdrop is gone and the composer can be dragged.
5. Find the open-in-new-window icon in the composer title bar, immediately before Mail's minimize, maximize, and close controls.
6. Select the icon and allow pop-ups for the Nextcloud origin if the browser asks.

## Update an installation made with Git

```bash
cd /var/www/nextcloud/custom_apps/mail_popout
sudo -u www-data git pull --ff-only origin main
cd /var/www/nextcloud
sudo -u www-data php occ upgrade
```

For AIO, update the host checkout, copy its contents over the existing container directory, restore `www-data` ownership, and run:

```bash
docker cp mail_popout/. nextcloud-aio-nextcloud:/var/www/html/custom_apps/mail_popout/
docker exec nextcloud-aio-nextcloud \
  chown -R www-data:www-data /var/www/html/custom_apps/mail_popout
docker exec --user www-data nextcloud-aio-nextcloud php occ upgrade
```

Hard-refresh Mail after updating so the browser does not keep an older JavaScript or CSS asset.

## Disable or remove

Disable the app without deleting its files:

```bash
cd /var/www/nextcloud
sudo -u www-data php occ app:disable mail_popout
```

After disabling it, the `custom_apps/mail_popout` directory can be removed during a maintenance window. Mail drafts and account data are owned by Mail and are not deleted by disabling Mail Pop-out.

## Troubleshooting

### The open-in-new-window icon is missing

- Confirm that `mail_popout` appears under enabled apps.
- Confirm that the directory is named exactly `mail_popout`.
- Close the existing composer and hard-refresh the Mail page.
- Clear a reverse-proxy or CDN cache if JavaScript assets are cached there.
- Open the browser developer tools and confirm that these requests return HTTP 200:
  - `/custom_apps/mail_popout/js/mail-popout.js`
  - `/custom_apps/mail_popout/css/mail-popout.css`

### The separate browser window does not open

Allow pop-ups for the exact Nextcloud domain. The composer remains usable as an in-page floating window when the browser blocks a separate window.

### The app cannot be enabled

Check the Nextcloud and PHP versions against the requirements above, verify file ownership, and inspect the Nextcloud log:

```bash
sudo -u www-data php /var/www/nextcloud/occ log:watch
```

For AIO:

```bash
docker exec --user www-data nextcloud-aio-nextcloud php occ log:watch
```
