/**
 * Renders the app icons (amber dot-matrix "P" on an LCD, set in the sampler
 * chassis) to PNG with Playwright's Chromium. Run: node scripts/make-icons.mjs
 * Output goes to public/icons/. Re-run only when the icon design changes.
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

// Playwright may be installed globally (not a project dependency); require() honours NODE_PATH.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const P = ['1111.', '1...1', '1...1', '1111.', '1....', '1....', '1....'];

/** @param {number} lcdInset fraction of the icon taken by the chassis border on each side */
function svg(size, lcdInset) {
  const s = 512;
  const inset = s * lcdInset;
  const lcd = s - inset * 2;
  const pitch = lcd / 8.2;
  const r = pitch * 0.36;
  const gx = s / 2 - pitch * 2;
  const gy = s / 2 - pitch * 3;
  let dots = '';
  P.forEach((row, y) => [...row].forEach((ch, x) => {
    const cx = gx + x * pitch;
    const cy = gy + y * pitch;
    dots += ch === '1'
      ? `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" rx="${r * 0.35}" fill="#ffb347" filter="url(#glow)"/>`
      : `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" rx="${r * 0.35}" fill="#3b2c18"/>`;
  }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="chassis" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4d2c9"/><stop offset="1" stop-color="#b6b4aa"/></linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${r * 0.45}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="inner" x="0" y="0" width="1" height="1"><feOffset dy="${s * 0.012}"/><feGaussianBlur stdDeviation="${s * 0.02}"/><feComposite operator="out" in="SourceGraphic"/><feComponentTransfer><feFuncA type="linear" slope="0.8"/></feComponentTransfer><feBlend in2="SourceGraphic"/></filter>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#chassis)"/>
  <rect x="${inset}" y="${inset}" width="${lcd}" height="${lcd}" rx="${lcd * 0.09}" fill="#1f1810"/>
  <rect x="${inset}" y="${inset}" width="${lcd}" height="${lcd}" rx="${lcd * 0.09}" fill="none" stroke="#0c0906" stroke-width="${s * 0.012}"/>
  ${dots}
</svg>`;
}

const targets = [
  { file: 'apple-touch-icon.png', size: 180, inset: 0.14 },
  { file: 'icon-192.png', size: 192, inset: 0.14 },
  { file: 'icon-512.png', size: 512, inset: 0.14 },
  // Maskable: platforms may crop to a circle, so keep the LCD inside the central safe zone.
  { file: 'icon-maskable-512.png', size: 512, inset: 0.22 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(t.size, t.inset)}</body></html>`);
  const png = await page.locator('svg').screenshot({ omitBackground: false });
  writeFileSync(`public/icons/${t.file}`, png);
  console.log('wrote', t.file);
}
writeFileSync('public/icons/icon.svg', svg(512, 0.14));
await browser.close();
