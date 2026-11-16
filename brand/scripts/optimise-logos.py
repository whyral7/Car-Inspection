#!/usr/bin/env python3
"""Make light copies of the logo files the app shows on every page.

The supplied artwork draws the tyre mark as tens of thousands of tiny straight segments (about 70 KB a
file). This removes points that sit on a straight run, within TOLERANCE of the original outline:
0.01 units on a 910-unit-wide drawing, about a thousandth of a pixel at header size. Nothing is redrawn
or recoloured, and the supplied files in public/brand stay as the source.

Writes public/brand/web/<same name>. components/logo.tsx reads from there.
Run after the artwork changes:  python3 brand/scripts/optimise-logos.py
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "public", "brand")
OUT = os.path.join(SRC, "web")
FILES = [
    "treadmark-lockup-small-color.svg",
    "treadmark-lockup-small-reverse.svg",
    "treadmark-lockup-horizontal-color.svg",
    "treadmark-lockup-horizontal-reverse.svg",
    "treadmark-mark-small-color.svg",
    "treadmark-mark-small-reverse.svg",
]
TOLERANCE = 0.01


def simplify(points, tolerance):
    """Ramer-Douglas-Peucker, iterative."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        (x1, y1), (x2, y2) = points[first], points[last]
        dx, dy = x2 - x1, y2 - y1
        length = (dx * dx + dy * dy) ** 0.5
        worst, index = 0.0, None
        for i in range(first + 1, last):
            px, py = points[i]
            if length == 0:
                distance = ((px - x1) ** 2 + (py - y1) ** 2) ** 0.5
            else:
                distance = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / length
            if distance > worst:
                worst, index = distance, i
        if index is not None and worst > tolerance:
            keep[index] = True
            stack.append((first, index))
            stack.append((index, last))
    return [p for p, k in zip(points, keep) if k]


def number(value):
    text = f"{value:.2f}".rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def optimise_path(d):
    if re.search(r"[^MLZ0-9eE.,\s-]", d):
        return d  # curves (the wordmark): left exactly as supplied
    out = []
    for subpath in re.findall(r"M[^M]*", d):
        closed = "Z" in subpath
        values = [float(v) for v in re.findall(r"-?\d*\.?\d+(?:[eE]-?\d+)?", subpath)]
        points = list(zip(values[0::2], values[1::2]))
        # Drop repeated points, then simplify. A closed outline is split at its two farthest-apart
        # points so the start point is not treated as special.
        points = [p for i, p in enumerate(points) if i == 0 or p != points[i - 1]]
        if closed and len(points) > 4:
            if points[0] == points[-1]:
                points = points[:-1]
            far = max(range(len(points)), key=lambda i: (points[i][0] - points[0][0]) ** 2 + (points[i][1] - points[0][1]) ** 2)
            first = simplify(points[: far + 1], TOLERANCE)
            second = simplify(points[far:] + [points[0]], TOLERANCE)
            points = first + second[1:-1]
        else:
            points = simplify(points, TOLERANCE)
        out.append("M" + "L".join(f"{number(x)} {number(y)}" for x, y in points) + ("Z" if closed else ""))
    return "".join(out)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name in FILES:
        source = open(os.path.join(SRC, name), encoding="utf8").read()
        result = re.sub(r' d="([^"]*)"', lambda m: f' d="{optimise_path(m.group(1))}"', source)
        with open(os.path.join(OUT, name), "w", encoding="utf8") as handle:
            handle.write(result)
        print(f"{name}: {len(source)} -> {len(result)} bytes")


if __name__ == "__main__":
    main()
