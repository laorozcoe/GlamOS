#!/usr/bin/env python3
"""
Genera el juego completo de iconos y logos de un salón.

    python scripts/generate-salon-icons.py demo "Sitio Demo" "#9333ea"

Escribe en public/<slug>/ los archivos que la app espera:

    logo.png                    usado por AppSidebar
    logo2.png                   usado por el login (auth/layout y SignInForm)
    apple-touch-icon.png        180x180, referenciado en app/layout.tsx
    favicon-32x32.png           referenciado en app/layout.tsx
    favicon-16x16.png           referenciado en app/layout.tsx
    favicon.ico                 48x48
    android-chrome-192x192.png  referenciado en app/manifest.ts
    android-chrome-512x512.png  referenciado en app/manifest.ts

La marca es geométrica a propósito: cuatro pétalos y un centro. Sobrevive a
16x16, que es donde la mayoría de los logos se vuelven una mancha.

Requiere Pillow:  pip install pillow
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

# Supermuestreo: se dibuja grande y se reduce, que es como se consiguen bordes
# suaves sin antialiasing propio en Pillow.
SS = 8

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf",
    "/usr/share/fonts/truetype/lato/Lato-Medium.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]


def load_font(size):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def hex_to_rgb(value):
    value = value.lstrip("#")
    if len(value) == 3:
        value = "".join(c * 2 for c in value)
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def draw_mark(draw, cx, cy, radius, fill, hole, compact=False):
    """
    Cuatro pétalos alrededor de un centro. `hole` es el color del centro.

    `compact` es la variante para 32px y menos: pétalos más separados y centro
    más grande. A tamaño pequeño la versión normal se cierra sobre sí misma y
    queda una mancha, que es el modo típico de fallar de un logo en el favicon.
    """
    if compact:
        petal, offset, center = radius * 0.52, radius * 0.52, radius * 0.34
    else:
        petal, offset, center = radius * 0.56, radius * 0.44, radius * 0.26

    for dx, dy in ((0, -offset), (offset, 0), (0, offset), (-offset, 0)):
        draw.ellipse(
            [cx + dx - petal, cy + dy - petal, cx + dx + petal, cy + dy + petal],
            fill=fill,
        )
    draw.ellipse([cx - center, cy - center, cx + center, cy + center], fill=hole)


def make_icon(size, brand, label=None):
    """Baldosa redondeada del color de la marca con el pétalo en blanco."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    compact = size <= 32
    draw.rounded_rectangle(
        [0, 0, big - 1, big - 1],
        radius=big * (0.20 if compact else 0.22),
        fill=brand + (255,),
    )

    cy = big / 2
    radius = big * (0.34 if compact else 0.30)
    if label:
        # Se sube la marca para dejar sitio al texto.
        cy = big * 0.40
        radius = big * 0.22

    draw_mark(draw, big / 2, cy, radius, (255, 255, 255, 255), brand + (255,), compact)

    if label:
        font = load_font(int(big * 0.105))
        bbox = draw.textbbox((0, 0), label, font=font)
        w = bbox[2] - bbox[0]
        draw.text(
            ((big - w) / 2 - bbox[0], big * 0.68),
            label,
            font=font,
            fill=(255, 255, 255, 255),
        )

    return img.resize((size, size), Image.LANCZOS)


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)

    slug, name, color = sys.argv[1], sys.argv[2], sys.argv[3]
    brand = hex_to_rgb(color)

    out = os.path.join("public", slug)
    os.makedirs(out, exist_ok=True)

    logo = make_icon(512, brand, label=name)
    logo.save(os.path.join(out, "logo.png"))
    logo.save(os.path.join(out, "logo2.png"))

    for size, filename in (
        (180, "apple-touch-icon.png"),
        (192, "android-chrome-192x192.png"),
        (512, "android-chrome-512x512.png"),
        (32, "favicon-32x32.png"),
        (16, "favicon-16x16.png"),
    ):
        make_icon(size, brand).save(os.path.join(out, filename))

    make_icon(48, brand).save(
        os.path.join(out, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)]
    )

    print(f"Iconos de '{name}' escritos en {out}/")
    for f in sorted(os.listdir(out)):
        print("   ", f)


if __name__ == "__main__":
    main()
