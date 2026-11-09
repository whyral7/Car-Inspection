#!/usr/bin/env node
// Treadmark brand check. Run: node brand/scripts/check-brand.mjs [dir=src|app]
// Flags raw colours, off-brand fonts and banned copy in app code. Exit 1 on findings.
// Colour/px checks adapted from the design-system skill's validate-tokens.cjs (MIT, claudekit).
import fs from "node:fs"; import path from "node:path";
const roots = process.argv.slice(2).length ? process.argv.slice(2) : ["app", "src", "components"].filter((d) => fs.existsSync(d));
const skip = /node_modules|\.next|brand[\\/]|\.test\.|\.spec\.|pdf[\\/]theme/;
const exts = [".ts", ".tsx", ".js", ".jsx", ".css"];
const rules = [
  [/#[0-9A-Fa-f]{3,8}\b/g, "Raw hex colour: use a token (bg-surface, text-text-muted, var(--accent))"],
  [/\b(?:rgb|rgba|hsl|hsla)\s*\(/g, "Raw colour function: use a token"],
  [/\b(?:bg|text|border|ring|fill|stroke)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g, "Tailwind default palette: use brand colours"],
  [/font-family\s*:\s*(?!var\()/g, "Hard-coded font-family: use font-sans / font-mono or var(--font-*)"],
  [/accident[- ]free|100% guaranteed|best in india|ai[- ]powered|seamless|cutting[- ]edge|don't get cheated|trusted by thousands/gi, "Banned copy (see brand/reference/voice-profile.md)"],
  [/[★☆]/g, "Stars: scores are out of 10 with a grade word"],
  [/(?:\d|\})\s?\/\s?100\b/g, "Score shown out of 100: display out of 10 with displayScore()"],
];
let n = 0;
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name);
  if (skip.test(p)) continue; if (e.isDirectory()) walk(p); else if (exts.includes(path.extname(p))) scan(p); } };
const scan = (f) => fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
  if (/^\s*(\/\/|\/\*|\*)/.test(line) || /brand-check-ignore/.test(line)) return;
  for (const [re, msg] of rules) for (const m of line.match(re) || []) { n++; console.log(`${f}:${i + 1}  ${msg}  [${m}]`); } });
roots.forEach(walk);
console.log(n ? `\n${n} brand issue(s).` : "Brand check passed."); process.exit(n ? 1 : 0);
