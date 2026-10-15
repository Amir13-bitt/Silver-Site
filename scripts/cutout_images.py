#!/usr/bin/env python3
"""Cut product photos out of their backgrounds for the shop.

Runs during deploy (see .github/workflows/pages.yml). For every product in
js/products.js it downloads each photo, removes the background with rembg,
trims the empty space and saves a transparent WebP to assets/products/.
products.js is then rewritten to point at the cutouts.

Lifestyle shots (a piece worn by a model, a styled table) are skipped: silver
is nearly colorless, so a cutout whose median saturation is above MAX_SATURATION
is skin, fruit or fabric, not the piece. A cutout that fills more than
MAX_SUBJECT of the frame is skipped too. To drop a cutout you don't like, add
the product handle (or "handle-2" for its second photo) to
scripts/cutout_skip.txt. A product keeps its original photos if none of its
photos cut out cleanly. Already-processed photos are reused, so re-runs only
do new work.

Usage:  python3 scripts/cutout_images.py [site-root]
"""
import io
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

MAX_SUBJECT = 0.45   # fraction of the frame; above this it isn't a flat-lay of a piece
MIN_SUBJECT = 0.002  # below this the mask found nothing
MAX_SATURATION = 0.45  # median HSV saturation of the subject; silver sits well below
MAX_SIDE = 1400

root = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent)
products_js = root / "js" / "products.js"
out_dir = root / "assets" / "products"
out_dir.mkdir(parents=True, exist_ok=True)

src = products_js.read_text(encoding="utf-8")
header, body = src[: src.index("[")], src[src.index("[") : src.rindex("]") + 1]
products = json.loads(body)
session = new_session("isnet-general-use")
skip_file = root / "scripts" / "cutout_skip.txt"
manual_skips = {
    line.split("#")[0].strip()
    for line in (skip_file.read_text(encoding="utf-8").splitlines() if skip_file.exists() else [])
} - {""}


def fetch(url):
    safe = urllib.parse.quote(url, safe=":/%?=&")
    req = urllib.request.Request(safe, headers={"User-Agent": "Mozilla/5.0 (silver-site build)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def cutout(url, dest):
    """Return True when a clean cutout exists at dest (made now or earlier)."""
    skip_marker = dest.with_suffix(".skip")
    if dest.exists():
        return True
    if skip_marker.exists():
        return False
    img = Image.open(io.BytesIO(fetch(url))).convert("RGBA")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    cut = remove(img, session=session, post_process_mask=True)
    alpha = cut.getchannel("A").point(lambda a: 255 if a > 24 else 0)
    share = sum(alpha.histogram()[255:]) / (alpha.width * alpha.height)
    if not MIN_SUBJECT <= share <= MAX_SUBJECT:
        print(f"  skip (subject covers {share:.0%} of the frame): {url}")
        skip_marker.write_text(f"{share:.4f}\n")
        return False
    hsv = cut.convert("RGB").convert("HSV").getchannel("S")
    sats = sorted(s for s, a in zip(hsv.tobytes(), alpha.tobytes()) if a)
    saturation = sats[len(sats) // 2] / 255
    if saturation > MAX_SATURATION:
        print(f"  skip (colorful subject, saturation {saturation:.2f}; likely a lifestyle shot): {url}")
        skip_marker.write_text(f"saturation {saturation:.4f}\n")
        return False
    left, top, right, bottom = alpha.getbbox()
    pad = int(max(right - left, bottom - top) * 0.06)
    box = (max(0, left - pad), max(0, top - pad), min(cut.width, right + pad), min(cut.height, bottom + pad))
    cut.crop(box).save(dest, "WEBP", quality=88, method=6)
    return True


made = 0
for p in products:
    originals = p.get("photos") or p["images"]
    keep = []
    for i, url in enumerate(originals, start=1):
        dest = out_dir / f"{p['handle']}-{i}.webp"
        if p["handle"] in manual_skips or dest.stem in manual_skips:
            print(f"  skip (listed in cutout_skip.txt): {dest.stem}")
            continue
        try:
            if cutout(url, dest):
                keep.append(f"assets/products/{dest.name}")
        except Exception as e:  # unreachable host, unreadable image...
            print(f"  failed: {url} ({e})")
    if keep:
        p["photos"], p["images"], p["cutout"] = originals, keep, True
        made += 1
    print(f"{p['handle']}: {len(keep)}/{len(originals)} cut out")

products_js.write_text(header + json.dumps(products, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
print(f"Cutouts used for {made} of {len(products)} products.")
