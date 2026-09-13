#!/usr/bin/env python3
"""Play Store phone screenshot templates (1080x1920) + optional compose from raw captures."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_launcher_icons import (
    CREAM,
    CREAM_DARK,
    CREAM_LIGHT,
    GOLD,
    GOLD_LIGHT,
    TEAL,
    draw_cross,
    draw_glow,
    lerp,
)

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "scripts" / "play-store-assets"
RAW_DIR = ASSETS / "screenshots" / "raw"

W, H = 1080, 1920
PHONE_W, PHONE_H = 920, 1560
SCREEN_X = (W - PHONE_W) // 2
SCREEN_Y = 260
SCREEN_INSET = 20
INNER_W = PHONE_W - SCREEN_INSET * 2
INNER_H = PHONE_H - SCREEN_INSET * 2

LOCALES: dict[str, list[dict[str, str]]] = {
    "id": [
        {"file": "01-beranda", "title": "Beranda Ibadah", "subtitle": "Pendamping rohani harian di satu tempat"},
        {"file": "02-alkitab", "title": "Alkitab Offline", "subtitle": "Baca, cari, dan renungkan Firman kapan saja"},
        {"file": "03-renungan", "title": "Renungan Suara", "subtitle": "Teduh interaktif Full Duplex dengan AI"},
        {"file": "04-kidung", "title": "Kidung Jemaat", "subtitle": "Ribuan lagu rohani untuk pujian"},
        {"file": "05-byok", "title": "BYOK Aman", "subtitle": "API Key Gemini dienkripsi di HP Anda"},
        {"file": "06-pengaturan", "title": "Multibahasa & Privasi", "subtitle": "Alkitab untuk Indonesia · KJV untuk global"},
    ],
    "en": [
        {"file": "01-home", "title": "Worship Home", "subtitle": "Your daily spiritual companion in one place"},
        {"file": "02-bible", "title": "Offline KJV Bible", "subtitle": "Read, search, and reflect anywhere"},
        {"file": "03-devotion", "title": "Voice Devotion", "subtitle": "Interactive Full Duplex quiet time with AI"},
        {"file": "04-hymns", "title": "Hymn Library", "subtitle": "Thousands of worship songs to sing along"},
        {"file": "05-byok", "title": "Secure BYOK", "subtitle": "Your Gemini API key stays on your device"},
        {"file": "06-settings", "title": "Bilingual & Privacy", "subtitle": "Indonesian Bible · KJV worldwide"},
    ],
}


def load_font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = ["segoeuib.ttf", "georgiab.ttf"] if bold else ["segoeui.ttf", "georgia.ttf"]
    for name in names:
        path = Path(r"C:\Windows\Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def gradient_bg(width: int, height: int) -> Image.Image:
    img = Image.new("RGBA", (width, height))
    px = img.load()
    for y in range(height):
        for x in range(width):
            t = (x / (width - 1) * 0.4) + (y / (height - 1) * 0.6)
            px[x, y] = (
                lerp(CREAM_LIGHT[0], CREAM_DARK[0], t),
                lerp(CREAM_LIGHT[1], CREAM_DARK[1], t),
                lerp(CREAM_LIGHT[2], CREAM_DARK[2], t),
                255,
            )
    return img


def draw_phone_frame(draw: ImageDraw.ImageDraw) -> tuple[int, int, int, int]:
    outer = [SCREEN_X, SCREEN_Y, SCREEN_X + PHONE_W, SCREEN_Y + PHONE_H]
    draw.rounded_rectangle(outer, radius=48, fill=(255, 252, 247, 255), outline=TEAL, width=8)
    inner = [
        SCREEN_X + SCREEN_INSET,
        SCREEN_Y + SCREEN_INSET,
        SCREEN_X + PHONE_W - SCREEN_INSET,
        SCREEN_Y + PHONE_H - SCREEN_INSET,
    ]
    draw.rounded_rectangle(inner, radius=36, fill=CREAM, outline=(*GOLD, 120), width=2)
    return tuple(inner)  # type: ignore[return-value]


def _card(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill=(255, 252, 247, 255)) -> None:
    draw.rounded_rectangle([x, y, x + w, y + h], radius=18, fill=fill, outline=(*TEAL, 40), width=2)


def draw_mock_ui(draw: ImageDraw.ImageDraw, inner: tuple[int, int, int, int], slot: int) -> None:
    x0, y0, x1, y1 = inner
    w, h = x1 - x0, y1 - y0
    pad = 36

    if slot == 1:
        _card(draw, x0 + pad, y0 + pad, w - pad * 2, 120, fill=(*TEAL, 28))
        for i, hh in enumerate([140, 100, 100]):
            _card(draw, x0 + pad, y0 + 190 + i * 120, w - pad * 2, hh)
        draw.ellipse([x1 - 130, y1 - 130, x1 - 40, y1 - 40], fill=GOLD)

    elif slot == 2:
        draw.text((x0 + pad, y0 + pad), "Kejadian 1:1", fill=TEAL, font=load_font(34, bold=True))
        for i in range(8):
            yy = y0 + 110 + i * 52
            draw.rounded_rectangle([x0 + pad, yy, x1 - pad, yy + 28], radius=8, fill=(TEAL[0], TEAL[1], TEAL[2], 35))

    elif slot == 3:
        cx = (x0 + x1) // 2
        cy = y0 + h // 2 - 40
        draw_glow(draw, cx, cy, 120, (*GOLD, 50))
        draw.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], fill=GOLD, outline=GOLD_LIGHT, width=4)
        draw.polygon([(cx + 18, cy - 28), (cx + 18, cy + 28), (cx + 48, cy)], fill=(255, 255, 255, 230))
        for i in range(5):
            bar_h = 24 + (i % 3) * 18
            bx = x0 + pad + i * 46
            draw.rounded_rectangle([bx, cy + 110, bx + 28, cy + 110 + bar_h], radius=6, fill=TEAL)

    elif slot == 4:
        _card(draw, x0 + pad, y0 + pad, w - pad * 2, 90, fill=(*GOLD, 40))
        for i in range(6):
            _card(draw, x0 + pad, y0 + 120 + i * 88, w - pad * 2, 68)

    elif slot == 5:
        _card(draw, x0 + pad, y0 + pad + 80, w - pad * 2, 220)
        draw.rounded_rectangle([x0 + pad + 24, y0 + pad + 140, x1 - pad - 24, y0 + pad + 190], radius=12, fill=(TEAL[0], TEAL[1], TEAL[2], 30))
        _card(draw, x0 + pad, y0 + pad + 360, w - pad * 2, 72, fill=(*GOLD, 55))
        draw.text((x0 + pad + 20, y0 + pad + 30), "Gemini API Key", fill=TEAL, font=load_font(28, bold=True))

    else:
        for i in range(5):
            yy = y0 + pad + i * 110
            _card(draw, x0 + pad, yy, w - pad * 2, 82)
            draw.ellipse([x1 - pad - 72, yy + 22, x1 - pad - 28, yy + 66], fill=(*TEAL, 60))


def render_header(draw: ImageDraw.ImageDraw, title: str, subtitle: str) -> None:
    title_font = load_font(46, bold=True)
    sub_font = load_font(24)
    draw.text((W // 2, 72), title, font=title_font, fill=TEAL, anchor="ma")
    draw.text((W // 2, 132), subtitle, font=sub_font, fill=(100, 88, 72, 255), anchor="ma")
    draw.rounded_rectangle([340, 168, 740, 172], radius=2, fill=GOLD_LIGHT)


def render_footer(draw: ImageDraw.ImageDraw) -> None:
    cx = W // 2
    cy = H - 72
    draw_cross(draw, cx, cy, 1.1)
    draw.text((cx, cy + 52), "Rhema AI", font=load_font(22, bold=True), fill=TEAL, anchor="ma")


def render_template(locale: str, slot: int, meta: dict[str, str], screenshot: Image.Image | None = None) -> Image.Image:
    img = gradient_bg(W, H)
    draw = ImageDraw.Draw(img, "RGBA")
    render_header(draw, meta["title"], meta["subtitle"])
    inner = draw_phone_frame(draw)

    if screenshot is not None:
        fitted = screenshot.convert("RGBA")
        fitted.thumbnail((INNER_W, INNER_H), Image.Resampling.LANCZOS)
        ox = inner[0] + (INNER_W - fitted.width) // 2
        oy = inner[1] + (INNER_H - fitted.height) // 2
        bg = Image.new("RGBA", (INNER_W, INNER_H), CREAM + (255,))
        bg.paste(fitted, ((INNER_W - fitted.width) // 2, (INNER_H - fitted.height) // 2), fitted)
        img.paste(bg, (inner[0], inner[1]))
        draw = ImageDraw.Draw(img, "RGBA")
    else:
        draw_mock_ui(draw, inner, slot)

    render_footer(draw)
    return img.convert("RGB")


def generate_templates(locale: str) -> list[Path]:
    out_dir = ASSETS / "screenshots" / locale
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for i, meta in enumerate(LOCALES[locale], start=1):
        path = out_dir / f"{meta['file']}.png"
        render_template(locale, i, meta).save(path, "PNG", optimize=True)
        paths.append(path)
    return paths


def compose_from_raw(locale: str) -> list[Path]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    out_dir = ASSETS / "screenshots" / f"{locale}-composed"
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for i, meta in enumerate(LOCALES[locale], start=1):
        candidates = sorted(RAW_DIR.glob(f"{i:02d}*")) + sorted(RAW_DIR.glob(f"{meta['file']}*"))
        if not candidates:
            continue
        shot = Image.open(candidates[0])
        path = out_dir / f"{meta['file']}.png"
        render_template(locale, i, meta, screenshot=shot).save(path, "PNG", optimize=True)
        paths.append(path)
    return paths


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Play Store screenshot templates for Rhema AI.")
    parser.add_argument("--locale", choices=["id", "en", "all"], default="all")
    parser.add_argument("--compose", action="store_true", help="Compose from scripts/play-store-assets/screenshots/raw/")
    args = parser.parse_args()

    locales = ["id", "en"] if args.locale == "all" else [args.locale]
    for locale in locales:
        if args.compose:
            composed = compose_from_raw(locale)
            if composed:
                print(f"[{locale}] Composed {len(composed)} screenshots -> {composed[0].parent}")
            else:
                print(f"[{locale}] No raw files in {RAW_DIR} (name like 01-*.png or 01-beranda*.png)")
        paths = generate_templates(locale)
        print(f"[{locale}] Templates: {paths[0].parent} ({len(paths)} files)")


if __name__ == "__main__":
    main()
