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
Deploy by uploading the folder to any static host (GitHub Pages, Netlify, Vercel, cPanel).

## Before going live: replace placeholders
- **Copy**: edit `js/i18n.js`. The story, collection names and descriptions are drafts.
- **Contact links**: in `index.html` (`#contact`), fill in the real Instagram handle, the WhatsApp number (`https://wa.me/<number>`) and the email address.
- **Product photos**: the collection cards use SVG illustrations (`.card__art`). Swap in real photos with `<img src="..." alt="...">` when they're available.
