# Faeze Mollaei: Handmade Silver

A bilingual (Persian RTL / English) single-page site for Faeze Mollaei's handmade sterling silver jewelry.

## Highlights
- **Liquid-silver hero**: a real-time WebGL chrome surface (`js/liquid.js`) that ripples toward the cursor and on press. It falls back to a static gradient when WebGL is unavailable.
- **Motion**: intro loader with curtain reveal, masked title reveal, a custom blend-mode cursor, magnetic buttons, 3D tilt cards with a light sheen, a sticky horizontal-scroll collection gallery, scroll-linked word reveals, a self-drawing process line, and a text fill on scroll.
- **Bilingual**: the FA/EN toggle switches text and direction (`rtl`/`ltr`) and remembers the choice. All copy lives in `js/i18n.js`.
- **Accessible and light**: respects `prefers-reduced-motion`, has no build step and no frameworks. Every jewelry illustration is inline SVG.

## Run locally
```sh
python3 -m http.server 8000
# open http://localhost:8000
```
## Deploy
Every push to `main` copies the site to your own server over SSH (`.github/workflows/deploy.yml`).
The repo can stay private. Add these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Example |
| --- | --- |
| `SSH_HOST` | `faezemollaei.com` |
| `SSH_USER` | your SSH user name |
| `SSH_PRIVATE_KEY` | a private key whose public half is in the server's `~/.ssh/authorized_keys` |
| `DEPLOY_PATH` | the folder the site is served from, e.g. `/home/USER/public_html` |
| `SSH_PORT` (optional) | defaults to `22` |

Create a dedicated key for deploys (no passphrase), then add the `.pub` line to the server's `~/.ssh/authorized_keys`:
```sh
ssh-keygen -t ed25519 -f silver-deploy -N "" -C "silver-site deploy"
```
Paste the contents of `silver-deploy` (the private key) into the `SSH_PRIVATE_KEY` secret.
Files already in `DEPLOY_PATH` that aren't part of this site are left untouched.

## Products
The shop reads `js/products.js`, which is generated from the store's product export:
```sh
pip install openpyxl
python3 scripts/import_products.py products.xlsx
```
Each product has two dimensions, **category** and **collection**, and the shop filters on both.
The export's collection column is empty, so the script detects the collection from the description.
Assign the rest in `COLLECTION_OVERRIDES` at the top of the script. English names live in `EN`.
Prices are stored in rials and shown in toman. Draft products are skipped.
Image links pointing to `localhost` are dropped, and those products show a silver placeholder.

## Before going live: replace placeholders
- **Copy**: edit `js/i18n.js`. The story, collection names and descriptions are drafts.
- **Contact links**: in `index.html` (`#contact`), fill in the real Instagram handle, the WhatsApp number (`https://wa.me/<number>`) and the email address.
