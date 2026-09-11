#!/usr/bin/env python3
"""Generate legacy mipmap PNG icons for Rhema AI launcher."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"

CREAM = (243, 238, 230)
CREAM_LIGHT = (255, 252, 247)
CREAM_DARK = (232, 223, 208)
GOLD_SHADOW = (168, 132, 40)
GOLD = (196, 146, 58)
GOLD_LIGHT = (232, 197, 71)
TEAL = (42, 106, 134)


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def gradient_bg(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            r = lerp(CREAM_LIGHT[0], CREAM_DARK[0], t)
            g = lerp(CREAM_LIGHT[1], CREAM_DARK[1], t)
            b = lerp(CREAM_LIGHT[2], CREAM_DARK[2], t)
            px[x, y] = (r, g, b, 255)
    return img


def draw_glow(img: ImageDraw.ImageDraw, cx: float, cy: float, radius: float, color: tuple[int, int, int, int]) -> None:
    steps = 18
    for i in range(steps, 0, -1):
        t = i / steps
        alpha = int(color[3] * t * t)
        r = radius * t
        bbox = [cx - r, cy - r, cx + r, cy + r]
        img.ellipse(bbox, fill=(color[0], color[1], color[2], alpha))


def draw_cross(draw: ImageDraw.ImageDraw, cx: float, cy: float, scale: float) -> None:
    v_w = 18 * scale
    v_h = 67 * scale
    h_w = 54 * scale
    h_h = 16 * scale
    h_y = cy - 8 * scale

    def rect(x0, y0, x1, y1, fill, radius=0):
        draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill)

    # shadow
    rect(cx - v_w / 2 + scale, cy - v_h / 2 + scale, cx + v_w / 2 + scale, cy + v_h / 2 + scale, GOLD_SHADOW, 2 * scale)
    rect(cx - h_w / 2 + scale, h_y - h_h / 2 + scale, cx + h_w / 2 + scale, h_y + h_h / 2 + scale, GOLD_SHADOW, 2 * scale)
    # main
    rect(cx - v_w / 2, cy - v_h / 2, cx + v_w / 2, cy + v_h / 2, GOLD, 3 * scale)
    rect(cx - h_w / 2, h_y - h_h / 2, cx + h_w / 2, h_y + h_h / 2, GOLD, 3 * scale)
    # highlight
    rect(cx - 2 * scale, cy - v_h / 2 + 3 * scale, cx + 2 * scale, cy + v_h / 2 - 3 * scale, GOLD_LIGHT, scale)


def render_icon(size: int, *, adaptive_foreground: bool = False) -> Image.Image:
    img = gradient_bg(size)
    draw = ImageDraw.Draw(img, "RGBA")
    cx = cy = size / 2

    if adaptive_foreground:
        # Transparent outer for adaptive foreground PNG
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img, "RGBA")
        scale = size / 108.0
        draw_glow(draw, cx, cy, 30 * scale, (*GOLD, 55))
        draw_cross(draw, cx, cy, scale)
        return img

    scale = size / 108.0
    draw_glow(draw, cx, cy, 42 * scale, (*GOLD, 40))
    draw_glow(draw, cx, cy, 28 * scale, (*TEAL, 25))
    # subtle teal base
    draw.pieslice([cx - 46 * scale, cy - 46 * scale, cx + 46 * scale, cy + 46 * scale], 200, 340, fill=(TEAL[0], TEAL[1], TEAL[2], 20))
    draw_cross(draw, cx, cy, scale)
    return img


def save_png(path: Path, image: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.name.endswith("_foreground.png"):
        image.save(path, "PNG")
    else:
        image.convert("RGB").save(path, "PNG")


def main() -> None:
    densities = {
        "mdpi": 48,
        "hdpi": 72,
        "xhdpi": 96,
        "xxhdpi": 144,
        "xxxhdpi": 192,
    }
    fg_densities = {
        "mdpi": 108,
        "hdpi": 162,
        "xhdpi": 216,
        "xxhdpi": 324,
        "xxxhdpi": 432,
    }

    for density, size in densities.items():
        folder = RES / f"mipmap-{density}"
        icon = render_icon(size)
        save_png(folder / "ic_launcher.png", icon)
        save_png(folder / "ic_launcher_round.png", icon)

    for density, size in fg_densities.items():
        folder = RES / f"mipmap-{density}"
        fg = render_icon(size, adaptive_foreground=True)
        save_png(folder / "ic_launcher_foreground.png", fg)

    print("Generated launcher PNGs in", RES)


if __name__ == "__main__":
    main()
