# Nova AI — Updated Project

A lightweight Node.js chat application with Puter.js AI integration.

## Requirements
- Node.js 18+
- Internet connection for Puter.js and AI services

## Run locally
```bash
node server.js
```
Open http://127.0.0.1:3000

Set `PORT` to change the port. By default, the server listens on `127.0.0.1`. To expose it to your local network or a hosting platform, configure `HOST=0.0.0.0` as appropriate.

## Features
- Account registration and sign-in
- File-backed account and chat data under `data/`
- New chats are created only when the first message is sent
- Rename, pin, archive, share, and delete individual chats
- Delete all chats and their share links
- Change account username and assistant display name
- Light/dark theme and optional custom WOFF2 font
- Image upload and Puter.js image generation (if supported by the active Puter.js account/API)
- First-account onboarding tips for image generation, Deepthink, and uploads
- Deepthink toggle for more structured responses (prompt-guided; not a separate guaranteed model)
- Open images in a large viewer and download generated images
- Copy buttons for code blocks
- Chat menu opens beside the selected chat
- Nova session token persists in the current browser using localStorage

## Puter authentication
Puter authentication is separate from Nova account authentication. Puter controls its own sign-in and session. This project does not store or embed a creator's Puter username/password or API secrets in frontend code. Users may need to authorize Puter in their browser. Never put private credentials into GitHub or client-side HTML/JavaScript.

## Data and deployment
Runtime user data is written to `data/`. Do not commit real user accounts, chat histories, share snapshots, passwords, or secrets to GitHub. For public deployment, add HTTPS, rate limiting, secure persistent sessions, backup/restore, and stronger operational controls. The default server binds to localhost.

## Custom font
Put a WOFF2 font at `fonts/custom.woff2`, then choose Custom WOFF2 in Settings.


## Nova-DSS CPL Ai branding
- App name: **Nova-DSS CPL Ai**
- Tagline: **Draw Your Idea in Reality**
- Footer copyright: **2026 Nova-DSS Ai, All Rights Reserved, Creator: Sajad Samandijan (Mr.DoubleS)**
- Use the language button in the top bar to switch between Persian and English. The selected language is saved in this browser.


## Deploy to Railway

This project is prepared for Railway.

1. Push the **contents of this `nova-ai-project` folder** to a GitHub repository.
2. In Railway, create a project with **Deploy from GitHub Repo** and select that repository.
3. If you upload the whole ZIP's extracted folder without moving its contents, set the Railway service **Root Directory** to `/nova-ai-project`. If the repository contains the project files directly, leave Root Directory as `/`.
4. Railway detects `package.json`; the start command is `npm start`. The server listens on `0.0.0.0` and uses Railway's `PORT` automatically.
5. In the service's **Volumes** settings, add a persistent volume mounted at `/app/data`. This is essential: account records, chat histories, and shared-chat snapshots are stored there.
6. Deploy, then open **Settings → Networking → Generate Domain** to create a public HTTPS domain.

### Important deployment notes

- Do not commit real user data. `data/accounts.json`, chat files, and share files are excluded by `.gitignore`.
- The volume must be mounted at `/app/data` when the service root is this project folder. If you change the service root or deployment layout, adjust the mount path to the actual application `data` directory.
- A volume protects files across deploys/restarts, but it is not a backup. Set up backups for important user data.
- This starter app keeps login sessions in server memory. Users may need to sign in again after a service restart or redeploy.
- For a public production service, add rate limiting, monitoring, automated backups, and stronger session management before inviting many users.
