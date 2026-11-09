# ScoreMeter

The overall score out of 10 (one decimal), its grade in words, and five rising bars.

- Number in `display-lg` style (Martel Sans ExtraBold, tabular), then the bars, then grade and one line of context.
- Fill bars by score: bar n fills when the score is at least 2n − 1 (1, 3, 5, 7, 9), so 8.4 fills four. The highest filled bar is `tip` (accent), the rest `on` (text), unfilled stay `border`.
- Grades: 9.0–10 Excellent, 7.5–8.9 Very good, 6.0–7.4 Good, 4.5–5.9 Below average, under 4.5 Poor. No stars: one scale only, everywhere (app, report, WhatsApp, marketing).
- When a cap applies (major accident, flood), say so in the sub line: "Capped: major accident".
- Give the wrapper `role="img"` and an `aria-label` with the score and grade: "Score 8.4 out of 10, very good".

## Spec

| Part | Token |
| --- | --- |
| Number | `score-font` (ExtraBold 48/44, tabular), `score-tracking`, colour `score-fg`; unit `score-unit-font` in `score-sub` |
| Bars | `score-bar-width` (10px), gap `score-bar-gap` (4px), radius `score-bar-radius`; heights rise from `score-bar-min` (16px) by `score-bar-step` (7px) to `score-bar-height` (44px), set by the stylesheet, not inline |
| Bar colours | unfilled `score-bar`, filled `score-bar-on`, highest filled `score-bar-tip` (all 3:1 or better on `surface`) |
| Grade and sub line | `type-title-sm` in `score-fg`; `type-caption` in `score-sub` |

Static: no states. The fill animates once over `dur-slow` on the report, and not at all with reduced motion.
