# Nova-DSS Admin Panel

## Included
- `server.js`: main application server extended with protected admin APIs
- `public/admin.html`: responsive Persian admin console
- `package.json`, `railway.json`: current project deployment configuration

## Important: use the existing Railway service
This package is intended to be merged into the existing Nova-DSS repository/service, not deployed as an independent copy. The admin console reads and modifies the same `data/accounts.json`, `data/chats/` and `data/shares/` files as the user-facing app.

## 1) Back up first
Download a backup of the existing Railway data volume before replacing `server.js`. Never test destructive actions on production data.

## 2) Add Railway variables
In the existing Railway service -> Variables, add:
- `ADMIN_USERNAME` = a new private admin username
- `ADMIN_PASSWORD` = a long unique password (at least 20 characters recommended)

Do not put these credentials in HTML, GitHub source, or frontend JavaScript.

## 3) Add a persistent Railway Volume
In the existing service -> Volumes, create/attach a volume with mount path:
`/app/data`

The server uses `DATA = path.join(__dirname, 'data')`. Confirm the service's working directory is `/app`; if Railway shows another root path, mount the volume at `<that-root>/data`. Before attaching a new empty volume to production, copy existing `data` files into it or you may appear to lose existing accounts/chats. Keep a backup.

## 4) Merge files
- Replace the repository root `server.js` with this package's `server.js`.
- Copy `public/admin.html` into the existing repository's `public/` directory.
- Keep your existing `public/index.html`, `public/shared.html`, fonts and other assets. Do not replace the whole public directory with this package.
- `package.json` and `railway.json` can remain as they are; no dependency was added.

## 5) Deploy and open
After deploying, open:
`https://YOUR-EXISTING-RAILWAY-DOMAIN/admin`

Sign in using `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

## Admin API features
- Overview counters
- Search/list users
- Disable/enable accounts (login is blocked for disabled users)
- Delete a user and that user's chats/shares
- List, inspect and delete a user's chats
- Save announcements
- Save global feature/maintenance flags
- Audit log for admin operations

## Important limitations / next integration
Announcements are saved by the admin API but are not yet automatically displayed in the user-facing Nova-DSS UI. Likewise, feature flags are stored centrally; the user-facing AI frontend must read and enforce them before they affect image generation, Deepthink, or maintenance mode. This is deliberately not presented as live enforcement until those client/server integrations are added.

The current app stores user data as JSON files on the server filesystem. The Railway Volume is essential for persistence across redeploys/restarts. A single local volume is not a multi-region shared database; for multiple replicas or high availability, migrate to PostgreSQL/object storage.

Admin login tokens are held in process memory and expire after 8 hours; a server restart logs the admin out. Use HTTPS (Railway domain provides HTTPS). The admin page uses `sessionStorage` and does not store the password.
