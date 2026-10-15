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
Every push to `main` deploys to GitHub Pages via `.github/workflows/pages.yml`
(one-time setup: **Settings → Pages → Source: GitHub Actions**).
The site uses only relative paths, so it also works from any other static host (Netlify, Vercel, cPanel).

## Products
The shop reads `js/products.js`, which is generated from the store's product export:
```sh
pip install openpyxl
python3 scripts/import_products.py products.xlsx
```
Each product has two dimensions, **category** and **collection**, and the shop filters on both.
The export's collection column is empty, so the script detects the collection from the description.
Assign the rest in `COLLECTION_OVERRIDES` at the top of the script. English names live in `EN`.
Prices are stored in rials and shown in toman. Draft products are skipped, and so are products without a usable photo
(image links pointing to `localhost` are dropped). Only availability is published ("Sold out"), never stock counts.

### Photo cutouts
On every deploy, `scripts/cutout_images.py` downloads the product photos, removes their backgrounds (rembg, `isnet-general-use`)
and serves transparent cutouts from `assets/products/`. Lifestyle shots (a piece worn by a model, fruit, fabric) are skipped
automatically. To drop a cutout you don't like, add the product handle, or `handle-2` for its second photo, to
`scripts/cutout_skip.txt`. To cut a piece out of a lifestyle shot (earrings held in a hand, a ring beside fruit), add the photo to `scripts/cutout_focus.txt` with a crop box around the piece. If the cutout step fails, the site deploys with the original photos.

## Before going live: replace placeholders
- **Copy**: edit `js/i18n.js`. The story, collection names and descriptions are drafts.
- **Contact links**: in `index.html` (`#contact`), fill in the real Instagram handle, the WhatsApp number (`https://wa.me/<number>`) and the email address.
