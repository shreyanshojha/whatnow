#!/usr/bin/env python3
"""Generate WhatNow store assets: icon, adaptive-icon, splash, favicon.
Warm friendly brand — coral/peach gradient tile with a clean compass mark
(a nod to "which way now?"). Pure Pillow, no external fonts required.
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)

CORAL = (232, 101, 74)
CORAL_DEEP = (207, 77, 51)
PEACH = (247, 178, 103)
CREAM = (253, 246, 238)
INK = (44, 35, 32)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def diagonal_gradient(size, c1, c2):
    """Smooth diagonal (top-left -> bottom-right) gradient."""
    img = Image.new("RGB", (size, size), c1)
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = lerp(c1, c2, t)
    return img


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def compass_mark(draw, cx, cy, r, needle_a, needle_b, ring):
    """A friendly compass: a soft ring and a two-tone needle."""
    # ring
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ring, width=max(4, r // 12))
    # needle (rotated diamond, pointing NE)
    ang = math.radians(-38)
    dx, dy = math.cos(ang), math.sin(ang)
    px, py = -math.sin(ang), math.cos(ang)
    tip = r * 0.86
    wid = r * 0.24
    # north half
    p_n = (cx + dx * tip, cy + dy * tip)
    p_l = (cx + px * wid, cy + py * wid)
    p_r = (cx - px * wid, cy - py * wid)
    p_c = (cx, cy)
    draw.polygon([p_n, p_l, p_c, p_r], fill=needle_a)
    # south half
    p_s = (cx - dx * tip, cy - dy * tip)
    draw.polygon([p_s, p_l, p_c, p_r], fill=needle_b)
    # center pin
    pin = max(6, r // 12)
    draw.ellipse([cx - pin, cy - pin, cx + pin, cy + pin], fill=CREAM)


def make_icon(size=1024):
    grad = diagonal_gradient(size, PEACH, CORAL_DEEP)
    mask = rounded_mask(size, int(size * 0.235))
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.paste(grad, (0, 0), mask)
    draw = ImageDraw.Draw(img)
    # soft cream bubble tile behind the mark
    bub = int(size * 0.30)
    cx, cy = size // 2, int(size * 0.46)
    draw.ellipse([cx - bub, cy - bub, cx + bub, cy + bub], fill=CREAM)
    compass_mark(draw, cx, cy, int(bub * 0.72), CORAL, (233, 205, 190), CORAL)
    # wordmark
    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(size * 0.115)
        )
    except Exception:
        font = ImageFont.load_default()
    text = "WhatNow"
    tb = draw.textbbox((0, 0), text, font=font)
    tw = tb[2] - tb[0]
    draw.text(((size - tw) / 2, int(size * 0.775)), text, font=font, fill=CREAM)
    img.save(os.path.join(OUT, "icon.png"))
    # favicon (small)
    img.resize((196, 196), Image.LANCZOS).save(os.path.join(OUT, "favicon.png"))
    return img


def make_adaptive(size=1024):
    """Foreground only, transparent, mark centered within the safe zone."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    bub = int(size * 0.245)  # keep inside ~66% safe circle
    draw.ellipse([cx - bub, cy - bub, cx + bub, cy + bub], fill=CORAL)
    compass_mark(draw, cx, cy, int(bub * 0.72), CREAM, (247, 200, 178), CREAM)
    img.save(os.path.join(OUT, "adaptive-icon.png"))
    # keep the SDK-generated android foreground name in sync too
    img.save(os.path.join(OUT, "android-icon-foreground.png"))


def make_splash(size=1024):
    """Transparent lockup; the splash plugin paints the cream background."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, int(size * 0.42)
    bub = int(size * 0.20)
    draw.ellipse([cx - bub, cy - bub, cx + bub, cy + bub], fill=CORAL)
    compass_mark(draw, cx, cy, int(bub * 0.72), CREAM, (247, 200, 178), CREAM)
    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(size * 0.095)
        )
        tag_font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", int(size * 0.040)
        )
    except Exception:
        font = ImageFont.load_default()
        tag_font = font
    text = "WhatNow"
    tb = draw.textbbox((0, 0), text, font=font)
    draw.text(((size - (tb[2] - tb[0])) / 2, int(size * 0.63)), text, font=font, fill=INK)
    tag = "Plans around your mood"
    tt = draw.textbbox((0, 0), tag, font=tag_font)
    draw.text(
        ((size - (tt[2] - tt[0])) / 2, int(size * 0.735)), tag, font=tag_font, fill=CORAL_DEEP
    )
    img.save(os.path.join(OUT, "splash.png"))


if __name__ == "__main__":
    make_icon()
    make_adaptive()
    make_splash()
    print("Assets written to", os.path.abspath(OUT))
