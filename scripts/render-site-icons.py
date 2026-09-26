"""Render PNG companions for the Magic Room's editable SVG icon designs."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public"
SCALE = 4


def rgb(value):
    return tuple(bytes.fromhex(value.removeprefix("#")))


def gradient(size, top, bottom):
    image = Image.new("RGB", size)
    pixels = image.load()
    a, b = rgb(top), rgb(bottom)
    for y in range(size[1]):
        t = y / max(1, size[1] - 1)
        color = tuple(round(a[c] * (1 - t) + b[c] * t) for c in range(3))
        for x in range(size[0]):
            pixels[x, y] = color
    return image


def star(draw, cx, cy, radius, fill):
    small = radius * 0.23
    points = [
        (cx, cy - radius), (cx + small, cy - small),
        (cx + radius, cy), (cx + small, cy + small),
        (cx, cy + radius), (cx - small, cy + small),
        (cx - radius, cy), (cx - small, cy - small),
    ]
    draw.polygon(points, fill=fill)


def arch(draw, box, fill):
    x0, y0, x1, y1 = box
    radius = (x1 - x0) / 2
    draw.rectangle((x0, y0 + radius, x1, y1), fill=fill)
    draw.pieslice((x0, y0, x1, y0 + 2 * radius), 180, 360, fill=fill)


def favicon(size):
    s = size / 128
    image = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(image)
    p = lambda value: round(value * s)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=p(29), fill="#252941")
    arch(draw, tuple(map(p, (22, 11, 106, 107))), "#f7e9d4")
    arch(draw, tuple(map(p, (32, 21, 96, 99))), "#c1accb")
    draw.ellipse(tuple(map(p, (46, 53, 82, 89))), fill="#ffe3ad")
    draw.polygon([(p(32), p(96)), (p(48), p(90)), (p(65), p(88)), (p(82), p(92)), (p(96), p(95)), (p(96), p(99)), (p(32), p(99))], fill="#777392")
    draw.line(tuple(map(p, (64, 22, 64, 99))), fill="#f7e9d4", width=p(5))
    draw.line(tuple(map(p, (32, 58, 96, 58))), fill="#f7e9d4", width=p(5))
    draw.line(tuple(map(p, (43, 113, 93, 64))), fill="#b98d70", width=p(7))
    draw.line(tuple(map(p, (43, 113, 93, 64))), fill="#f6d5a6", width=p(3))
    star(draw, p(95), p(58), p(15), "#fff4c9")
    draw.ellipse(tuple(map(p, (106, 35, 112, 41))), fill="#f4c4cd")
    draw.ellipse(tuple(map(p, (77, 34, 81, 38))), fill="#fff4c9")
    return image


def font(name, size):
    folder = Path("/System/Library/Fonts")
    candidates = {
        "serif": [folder / "Supplemental/Georgia Bold.ttf", folder / "Supplemental/Georgia.ttf"],
        "sans": [folder / "PingFang.ttc", folder / "Supplemental/Arial Unicode.ttf"],
    }
    for path in candidates[name]:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def share_card():
    w, h = 1200 * 2, 630 * 2
    image = gradient((w, h), "#292d49", "#736983").convert("RGBA")
    d = ImageDraw.Draw(image)
    q = lambda v: round(v * 2)

    glow = Image.new("RGBA", image.size)
    gd = ImageDraw.Draw(glow)
    gd.ellipse(tuple(map(q, (40, 30, 530, 560))), fill=(255, 211, 172, 64))
    gd.ellipse(tuple(map(q, (894, -60, 1170, 225))), fill=(215, 192, 239, 39))
    image = Image.alpha_composite(image, glow.filter(ImageFilter.GaussianBlur(q(37))))
    d = ImageDraw.Draw(image)

    # A single warm window anchors the book room, leaving the title readable.
    arch(d, tuple(map(q, (108, 40, 454, 522))), "#f5e5d0")
    arch(d, tuple(map(q, (127, 60, 435, 505))), "#c8b1ca")
    warm = Image.new("RGBA", image.size)
    wd = ImageDraw.Draw(warm)
    wd.ellipse(tuple(map(q, (175, 254, 389, 467))), fill=(255, 231, 184, 125))
    image = Image.alpha_composite(image, warm.filter(ImageFilter.GaussianBlur(q(23))))
    d = ImageDraw.Draw(image)
    d.ellipse(tuple(map(q, (229, 312, 335, 418))), fill="#ffe2ad")
    d.polygon([(q(127), q(470)), (q(190), q(447)), (q(254), q(460)), (q(348), q(442)), (q(435), q(464)), (q(435), q(505)), (q(127), q(505))], fill="#77748f")
    d.line(tuple(map(q, (281, 61, 281, 505))), fill="#f8ebd8", width=q(11))
    d.line(tuple(map(q, (127, 315, 435, 315))), fill="#f8ebd8", width=q(11))
    d.line(tuple(map(q, (107, 522, 455, 522))), fill="#ead8c5", width=q(21))

    # Flowers, crystal ball, wooden tabletop, and a wand catching its spark.
    d.line([(q(144), q(495)), (q(147), q(413))], fill="#667469", width=q(7))
    d.line([(q(145), q(468)), (q(97), q(421))], fill="#667469", width=q(6))
    for x, y, r in [(145, 409, 13), (99, 420, 10), (181, 384, 11), (132, 447, 9), (110, 459, 8)]:
        d.ellipse(tuple(map(q, (x-r, y-r, x+r, y+r))), fill="#efbac7")
    d.polygon([(q(92), q(530)), (q(462), q(530)), (q(502), q(556)), (q(56), q(556))], fill="#bd9982")
    d.ellipse(tuple(map(q, (228, 476, 314, 562))), fill="#d8c7e0", outline="#fff3dc", width=q(3))
    d.ellipse(tuple(map(q, (243, 485, 268, 510))), fill="#fff6e1")
    d.polygon([(q(237), q(563)), (q(305), q(563)), (q(314), q(572)), (q(227), q(572))], fill="#d0ad90")
    d.line(tuple(map(q, (330, 522, 475, 378))), fill="#b98b72", width=q(15))
    d.line(tuple(map(q, (330, 522, 475, 378))), fill="#f6d3aa", width=q(6))
    star(d, q(482), q(374), q(46), "#fff1c1")
    for x, y, r, color in [(380, 300, 5, "#fff0cc"), (523, 267, 5, "#fff0cc"), (410, 236, 3, "#fff0cc"), (536, 444, 4, "#fff0cc"), (453, 275, 5, "#f2c2d0"), (561, 344, 4, "#f2c2d0")]:
        d.ellipse(tuple(map(q, (x-r, y-r, x+r, y+r))), fill=color)

    d.text((q(600), q(162)), "Summer's", font=font("serif", q(67)), fill="#fff1dc")
    d.text((q(600), q(238)), "Magic Room", font=font("serif", q(67)), fill="#fff1dc")
    d.line(tuple(map(q, (602, 349, 949, 349))), fill="#e6c49f", width=q(3))
    d.text((q(600), q(374)), "大夏的魔法书屋", font=font("sans", q(43)), fill="#f8dce1")
    d.text((q(602), q(450)), "A little room for every season of wonder", font=font("serif", q(22)), fill="#e9dfdf")
    star(d, q(1058), q(142), q(18), "#f6e0b8")

    return image.convert("RGB").resize((1200, 630), Image.Resampling.LANCZOS)


if __name__ == "__main__":
    favicon(512).save(OUT / "favicon-512.png", optimize=True)
    favicon(180 * SCALE).resize((180, 180), Image.Resampling.LANCZOS).save(OUT / "apple-touch-icon.png", optimize=True)
    favicon(32 * SCALE).resize((32, 32), Image.Resampling.LANCZOS).save(OUT / "favicon-32.png", optimize=True)
    share_card().save(OUT / "og-image.png", optimize=True)
