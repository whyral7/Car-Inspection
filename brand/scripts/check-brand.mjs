#!/usr/bin/env node
// Treadmark brand check. Run: node brand/scripts/check-brand.mjs [dir=src|app]
// Flags raw colours, off-brand fonts, pill shapes and banned copy in app code and the strings files. Exit 1 on findings.
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
// Pills: nothing is pill-shaped except progress tracks (brand book, space and shape).
// A circle (rounded-full with an equal size-N) and a progress track are fine; anything else rounded-full is a pill.
const isPill = (line) => /\brounded-full\b/.test(line) && !/\bsize-[\d.[]/.test(line) && !/bg-progress-/.test(line);
// Copy rules (brand/reference/voice-profile.md) for the two strings files only.
const copyFiles = ["lib/strings.ts", "lib/strings.hi.ts"].filter((f) => fs.existsSync(f));
const copyRules = [
  [/[A-Za-z\u0900-\u097F]!(?=[\s"'`<]|$)/g, "Exclamation mark in copy"],
  [/\b(?:oops|sorry|trusted|honest report|revolutionary)\b/gi, "Banned copy (see brand/reference/voice-profile.md)"],
  [/वाहन|निरीक्षण/g, "Formal Hindi: write गाड़ी and जाँच"],
  [/(?<![\u0900-\u097F])कार(?:ें|ों)?(?![\u0900-\u097F])/g, "Hindi: write गाड़ी, not कार"],
  [/कृपया|\bkindly\b/gi, "No 'please' padding: say what to do"],
  [/\b(?:19|20|12)[ -](?:guided |real |quick |required )?(?:point|photos?|checks?)\b|\b(?:19|20|12) (?:असली |छोटी |ज़रूरी )?(?:फ़ोटो|जाँचें)/g, "Hard-coded count: pass it in from the config (photo angles, checklist items)"],
  [/Needs attention|\bis a Problem\b|\\"खराबी\\"/g, "Old rating word: the ratings are Pass, Attention, Fail and N/A"],
];
let n = 0;
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name);
  if (skip.test(p)) continue; if (e.isDirectory()) walk(p); else if (exts.includes(path.extname(p))) scan(p); } };
const scan = (f) => fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
  if (/^\s*(\/\/|\/\*|\*)/.test(line) || /brand-check-ignore/.test(line)) return;
  if (isPill(line)) { n++; console.log(`${f}:${i + 1}  Pill shape: use rounded-sm (badges) or rounded-md (controls)  [rounded-full]`); }
  for (const [re, msg] of rules) for (const m of line.match(re) || []) { n++; console.log(`${f}:${i + 1}  ${msg}  [${m}]`); } });
roots.forEach(walk);
for (const f of copyFiles) fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
  if (/^\s*(\/\/|\/\*|\*)/.test(line) || /brand-check-ignore/.test(line)) return;
  for (const [re, msg] of copyRules) for (const m of line.match(re) || []) { n++; console.log(`${f}:${i + 1}  ${msg}  [${m}]`); } });
console.log(n ? `\n${n} brand issue(s).` : "Brand check passed."); process.exit(n ? 1 : 0);
