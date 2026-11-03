# Recovery guide

## My data is gone (new browser, cleared site data, new device)

JobIntel keeps data only in the browser that created it. To get it back you need an encrypted backup
(`jobintel-backup-YYYY-MM-DD.jibak.json`) and its passphrase.

1. Open the site → *Profile & Preferences* → *Data & privacy* → **Import**.
2. Choose the backup file, enter the passphrase, press *Decrypt & replace*.
3. Profile, job decisions, applications (with history), referral leads and outreach history are restored.
   Nothing is changed unless decryption and validation succeed.

Without the passphrase a backup cannot be opened by anyone, including you. Export a fresh backup after
big changes (e.g. weekly); it's the only copy outside this browser.

## Import says "newer JobIntel" / unsupported version

The backup was made by a newer app version. Reload the page (to get the latest deployed version) and
import again. Older backups always import into newer versions.

## Local data shows an error after an update

The app never discards records that fail validation silently. Use *Data & privacy* to export what's
readable or import a backup; as a last resort, *Clear data* and restore from a backup.

## The job feed is stale or empty

- *Job Discovery → Sources* shows the last successful scan, recent scans and failing sources.
- A failed scan opens a `scan-failure` issue in the repository with a link to the run. The last good
  feed stays published.
- Run a scan by hand: GitHub → Actions → *Job discovery scan* → *Run workflow*.
- Scheduled workflows stop after 60 days without repository activity. The scan's own commits count as
  activity; if they stopped, re-enable the workflow in the Actions tab and run it once.
- A board that keeps failing: check it with `node collector/probe.ts <ats>:<board>` and fix or remove it in
  `collector/sources.json`.

## The site won't deploy

`pages.yml` runs typecheck, lint, tests, build, `check:dist` and E2E before deploying. Fix the failing
step locally (`npm ci && npm run typecheck && npm run lint && npm test && npm run build && npm run check:dist`
and `npm run test:e2e`), then push. Settings → Pages must use **GitHub Actions** as the source.

## Supported browsers

Current Chrome, Edge, Firefox and Safari (desktop and mobile). Needs IndexedDB and Web Crypto, which
require HTTPS (GitHub Pages provides it) or `localhost`. Private/incognito windows may discard data when
closed. Browser reminders need the Notification API and only work while a tab is open.
