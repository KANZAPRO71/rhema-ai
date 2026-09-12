#!/usr/bin/env python3
"""Generate Play Store feature graphic (1024x500) for Rhema AI."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_launcher_icons import (
    CREAM_DARK,
    CREAM_LIGHT,
    GOLD,
    GOLD_LIGHT,
    GOLD_SHADOW,
    TEAL,
    draw_cross,
    draw_glow,
    lerp,
)

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "scripts" / "play-store-assets"

W, H = 1024, 500

COPY: dict[str, dict[str, str]] = {
    "id": {
        "file": "feature-graphic-1024x500-id.png",
        "subtitle": "Renungan & Khotbah",
        "tagline": "Pendamping ibadah suara · Alkitab TB · Gemini BYOK",
        "underline_w": 320,
    },
    "en": {
        "file": "feature-graphic-1024x500-en.png",
        "subtitle": "Audio Devotion & Sermons",
        "tagline": "Full Duplex voice companion · KJV Bible · Gemini BYOK",
        "underline_w": 380,
    },
}


def gradient_bg_wide(width: int, height: int) -> Image.Image:
    img = Image.new("RGBA", (width, height))
    px = img.load()
    for y in range(height):
        for x in range(width):
            t = (x / (width - 1) * 0.65) + (y / (height - 1) * 0.35)
            r = lerp(CREAM_LIGHT[0], CREAM_DARK[0], t)
            g = lerp(CREAM_LIGHT[1], CREAM_DARK[1], t)
            b = lerp(CREAM_LIGHT[2], CREAM_DARK[2], t)
            px[x, y] = (r, g, b, 255)
    return img


def load_font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates.extend(
            [
                Path(r"C:\Windows\Fonts\segoeuib.ttf"),
                Path(r"C:\Windows\Fonts\georgiab.ttf"),
            ]
        )
    else:
        candidates.extend(
            [
                Path(r"C:\Windows\Fonts\segoeui.ttf"),
                Path(r"C:\Windows\Fonts\georgia.ttf"),
            ]
        )
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def render_feature_graphic(locale: str = "id") -> Image.Image:
    copy = COPY[locale]
    img = gradient_bg_wide(W, H)
    draw = ImageDraw.Draw(img, "RGBA")

    # Decorative arcs
    draw.arc([680, -80, 1180, 420], 110, 250, fill=(*TEAL, 28), width=3)
    draw.arc([720, -40, 1120, 360], 120, 240, fill=(*GOLD, 22), width=2)

    # Left emblem area
    cx, cy = 255, H / 2 + 8
    scale = 4.2
    draw_glow(draw, cx, cy, 150, (*GOLD, 45))
    draw_glow(draw, cx, cy, 95, (*TEAL, 30))
    draw.pieslice([cx - 120, cy - 120, cx + 120, cy + 120], 200, 340, fill=(*TEAL, 18))
    draw_cross(draw, cx, cy, scale)

    # Soft panel behind text
    draw.rounded_rectangle([430, 118, 980, 382], radius=28, fill=(255, 252, 247, 140), outline=(*GOLD, 40), width=2)

    title_font = load_font(68, bold=True)
    sub_font = load_font(34, bold=True)
    tag_font = load_font(22)

    title = "Rhema AI"
    subtitle = copy["subtitle"]
    tagline = copy["tagline"]

    tx, ty = 470, 148
    draw.text((tx, ty), title, font=title_font, fill=TEAL)
    draw.text((tx, ty + 82), subtitle, font=sub_font, fill=GOLD)
    draw.text((tx, ty + 138), tagline, font=tag_font, fill=(100, 88, 72, 255))

    # Accent underline
    uw = copy["underline_w"]
    draw.rounded_rectangle([tx, ty + 74, tx + uw, ty + 78], radius=2, fill=GOLD_LIGHT)

    return img.convert("RGB")


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    for locale, copy in COPY.items():
        out = ASSETS / copy["file"]
        graphic = render_feature_graphic(locale)
        graphic.save(out, "PNG", optimize=True)
        print(f"Feature graphic [{locale}]: {out} ({graphic.size[0]}x{graphic.size[1]}, {out.stat().st_size} bytes)")

    # Back-compat alias for Indonesian default listing
    id_path = ASSETS / COPY["id"]["file"]
    alias = ASSETS / "feature-graphic-1024x500.png"
    alias.write_bytes(id_path.read_bytes())
    print(f"Default alias: {alias}")


if __name__ == "__main__":
    main()
