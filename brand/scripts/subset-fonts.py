#!/usr/bin/env python3
"""Split the brand web fonts by script so a reader downloads only the glyphs their language needs.

Reads brand/fonts/web/*.woff2 (the full fonts, kept as the source) and writes
brand/fonts/web/subsets/<Font>-<latin|latin-ext|devanagari>.woff2. brand/next/fonts.ts loads the
subsets with matching unicode-range, so the browser fetches the Devanagari files only when a page
shows Hindi. Nothing is dropped: "latin-ext" holds every glyph the other two leave out.

Run after replacing a font file:  python3 brand/scripts/subset-fonts.py   (needs fonttools + brotli)
Keep RANGES in step with brand/next/fonts.ts.
"""
import os
from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "fonts", "web")
OUT = os.path.join(SRC, "subsets")

RANGES = {
    "latin": "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+20B9,U+2122,U+2190-2193,U+2212,U+2215,U+25CF,U+2713,U+FEFF,U+FFFD",
    "devanagari": "U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+25CC,U+A830-A839,U+A8E0-A8FF",
}
# The header's language switch shows the word "हिंदी" on every English page. This one-word file (about
# 2 KB) draws it, so English readers never fetch a full Devanagari weight for five characters.
TOGGLE_WORD = "हिंदी"

FONTS = {
    "MartelSans": (["Regular", "SemiBold", "Bold", "ExtraBold"], ["latin", "latin-ext", "devanagari"]),
    "IBMPlexMono": (["Regular", "Medium"], ["latin", "latin-ext"]),
}


def codepoints(spec):
    return set(subset.parse_unicodes(spec))


def write(src, dst, unicodes):
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = [1, 2, 3, 4, 5, 6]
    options.notdef_outline = True
    options.glyph_names = False
    options.hinting = False
    font = TTFont(src)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=sorted(unicodes))
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(dst)
    return os.path.getsize(dst)


def main():
    os.makedirs(OUT, exist_ok=True)
    for family, (weights, parts) in FONTS.items():
        for weight in weights:
            src = os.path.join(SRC, f"{family}-{weight}.woff2")
            covered = set(TTFont(src).getBestCmap().keys())
            named = {part: codepoints(RANGES[part]) & covered for part in parts if part in RANGES}
            if "latin-ext" in parts:
                named["latin-ext"] = covered - set().union(*named.values())
            for part in parts:
                size = write(src, os.path.join(OUT, f"{family}-{weight}-{part}.woff2"), named[part])
                print(f"{family}-{weight}-{part}: {len(named[part])} characters, {size} bytes")
            if weight == weights[0] and "latin-ext" in named:
                # Printed so the unicode-range in brand/next/fonts.ts can be checked against it.
                rest = sorted(named["latin-ext"])
                runs, start, prev = [], rest[0], rest[0]
                for cp in rest[1:] + [None]:
                    if cp is None or cp != prev + 1:
                        runs.append(f"U+{start:04X}" if start == prev else f"U+{start:04X}-{prev:04X}")
                        start = cp
                    prev = cp
                print(f"  {family} latin-ext range: {','.join(runs)}")
    src = os.path.join(SRC, "MartelSans-SemiBold.woff2")
    size = write(src, os.path.join(OUT, "MartelSans-SemiBold-toggle.woff2"), {ord(c) for c in TOGGLE_WORD})
    print(f"MartelSans-SemiBold-toggle: {size} bytes, " + ",".join(f"U+{ord(c):04X}" for c in sorted(set(TOGGLE_WORD))))


if __name__ == "__main__":
    main()
