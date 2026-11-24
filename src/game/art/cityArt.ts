import type Phaser from 'phaser';
import { paintCanvas, type Painter } from './painter';
import { P } from './palette';
import { drawTextCentered } from './pixelFont';

/**
 * Code-painted placeholder art for Bayport's streets: building fronts,
 * sidewalk, road and street furniture. Real art replaces this later
 * without changing the scenes.
 */
export const STREET_W = 640;
export const STREET_H = 192;
/** Building fronts end here; the sidewalk runs to the curb, then the road. */
export const FACADE_BOTTOM = 96;
export const CURB_Y = 144;

const C = {
  brick: '#8a4a3a',
  brickDark: '#6e3a2e',
  brickLight: '#a05a48',
  stone: '#b8b2a2',
  stoneDark: '#99937f',
  plaster: '#d9cdb0',
  plasterDark: '#bfb294',
  glass: '#38506a',
  glassLight: '#6d8fb0',
  glassDark: '#26384c',
  frame: '#2b2a30',
  sidewalk: '#a8a69c',
  sidewalkSeam: '#918f85',
  sidewalkLight: '#b9b7ad',
  curb: '#d2d0c6',
  road: '#3c3b42',
  roadDark: '#323137',
  lane: '#e8d27a',
  white: '#ece9dc',
  mint: '#5fae9a',
  teal: '#2f7d78',
  navy: '#24304a',
  plum: '#5d3f6a',
  rust: '#b8582e',
  cream: '#efe3c2',
  black: '#1d1c22',
  shutter: '#7d8088',
  shutterDark: '#666870',
  grass: '#5d8a4a',
};

function register(scene: Phaser.Scene, key: string, w: number, h: number, paint: (p: Painter) => void) {
  if (scene.textures.exists(key)) return;
  scene.textures.addCanvas(key, paintCanvas(w, h, paint));
}

// ---------- Building parts ----------

function brickWall(p: Painter, x: number, y: number, w: number, h: number, base = C.brick, dark = C.brickDark) {
  p.r(x, y, w, h, base);
  for (let yy = y; yy < y + h; yy += 4) {
    p.r(x, yy + 3, w, 1, dark);
    const off = ((yy - y) / 4) % 2 ? 4 : 0;
    for (let xx = x + off; xx < x + w; xx += 8) p.r(xx, yy, 1, 3, dark);
  }
}

function sidingWall(p: Painter, x: number, y: number, w: number, h: number, base: string, dark: string) {
  p.r(x, y, w, h, base);
  for (let yy = y + 3; yy < y + h; yy += 4) p.r(x, yy, w, 1, dark);
}

function cornice(p: Painter, x: number, w: number, y: number, color: string) {
  p.r(x, y, w, 4, color);
  p.r(x, y + 4, w, 1, P.ink);
  p.r(x, y, w, 1, '#ffffff22');
}

function window2(p: Painter, x: number, y: number, w = 12, h = 14, lit = false) {
  p.box(x, y, w, h, lit ? '#e8c46a' : C.glass, C.frame);
  if (!lit) {
    p.r(x + 2, y + 2, 2, h - 6, C.glassLight);
    p.r(x + 1, y + Math.floor(h / 2), w - 2, 1, C.frame);
  }
  p.r(x - 1, y + h, w + 2, 2, C.stone);
}

function door(p: Painter, x: number, y: number, color: string, glass = true) {
  // 16 × 26, bottom at y + 26.
  p.r(x - 2, y - 2, 20, 28, C.stoneDark);
  p.box(x, y, 16, 26, color, P.ink);
  if (glass) {
    p.r(x + 3, y + 3, 10, 10, C.glass);
    p.r(x + 4, y + 4, 2, 6, C.glassLight);
  }
  p.r(x + 12, y + 15, 2, 2, P.amber);
  p.r(x - 2, y + 26, 20, 2, C.stone); // step
}

function shopWindow(p: Painter, x: number, y: number, w: number, h: number, fill?: (p: Painter) => void) {
  p.box(x, y, w, h, C.glassDark, C.frame);
  p.r(x + 1, y + 1, w - 2, h - 2, C.glass);
  fill?.(p);
  for (let i = 0; i < 3; i++) p.r(x + 4 + i * 3, y + 3 + i * 2, 1, h - 10, '#ffffff30');
  p.r(x, y + h, w, 3, C.stoneDark);
}

function awning(p: Painter, x: number, w: number, y: number, a: string, b: string) {
  for (let i = 0; i < w; i += 8) p.r(x + i, y, Math.min(8, w - i), 9, (i / 8) % 2 ? b : a);
  p.r(x, y + 9, w, 1, P.ink);
  for (let i = 0; i < w; i += 8) p.r(x + i + 1, y + 10, 6, 2, (i / 8) % 2 ? b : a);
}

function sign(p: Painter, cx: number, y: number, text: string, bg: string, fg: string, scale = 1) {
  const w = text.length * 4 * scale + 6;
  const h = 5 * scale + 6;
  p.box(Math.round(cx - w / 2), y, w, h, bg, P.ink);
  drawTextCentered(p, cx, y + 3, text, fg, scale);
}

function roofline(p: Painter, x: number, w: number, top: number) {
  p.r(x, top - 3, w, 3, P.capDark);
}

// ---------- Ground ----------

function ground(p: Painter) {
  // Sidewalk slabs.
  p.r(0, FACADE_BOTTOM, STREET_W, CURB_Y - FACADE_BOTTOM, C.sidewalk);
  for (let y = FACADE_BOTTOM; y < CURB_Y; y += 16) p.r(0, y, STREET_W, 1, C.sidewalkSeam);
  for (let x = 0; x < STREET_W; x += 16) p.r(x, FACADE_BOTTOM, 1, CURB_Y - FACADE_BOTTOM, C.sidewalkSeam);
  for (let x = 4; x < STREET_W; x += 37) p.r(x, FACADE_BOTTOM + 5 + (x % 3) * 9, 2, 1, C.sidewalkLight);
  p.r(0, FACADE_BOTTOM, STREET_W, 2, '#00000030'); // shade at the wall
  // Curb and road.
  p.r(0, CURB_Y - 3, STREET_W, 3, C.curb);
  p.r(0, CURB_Y, STREET_W, STREET_H - CURB_Y, C.road);
  for (let x = 0; x < STREET_W; x += 5) p.r(x, CURB_Y + 2 + (x * 7) % 40, 1, 1, C.roadDark);
  p.r(0, CURB_Y, STREET_W, 2, C.roadDark);
  for (let x = 6; x < STREET_W; x += 32) p.r(x, CURB_Y + 23, 16, 2, C.lane);
}

function sky(p: Painter) {
  p.r(0, 0, STREET_W, FACADE_BOTTOM, '#4a6a8a');
}

// ---------- Eastside ----------

function paintEastside(p: Painter) {
  sky(p);
  // Alley fence on the far left.
  p.r(0, 40, 32, 56, '#5a5550');
  for (let x = 2; x < 32; x += 5) p.r(x, 40, 2, 56, '#6b665f');
  p.r(0, 52, 32, 1, '#3e3a36');
  p.r(0, 80, 32, 1, '#3e3a36');

  // Your building: four-storey brick walk-up. Door at x 104-120.
  roofline(p, 32, 160, 8);
  brickWall(p, 32, 8, 160, 88);
  cornice(p, 30, 164, 8, C.stone);
  for (const y of [18, 42]) for (let x = 44; x < 184; x += 24) window2(p, x, y, 12, 14, (x + y) % 3 === 0);
  window2(p, 44, 66);
  window2(p, 164, 66);
  door(p, 104, 68, '#3d5a7a');
  sign(p, 112, 58, 'BAYVIEW', C.cream, P.ink);
  p.r(136, 72, 10, 14, '#c9c3b0'); // mailboxes
  for (let yy = 74; yy < 86; yy += 4) p.r(137, yy, 8, 2, '#9a9480');

  // Laundromat.
  roofline(p, 192, 96, 30);
  sidingWall(p, 192, 30, 96, 66, '#7a9a8a', '#688878');
  cornice(p, 192, 96, 30, '#4e6a5e');
  sign(p, 240, 38, 'WASH N FOLD', C.white, C.teal);
  shopWindow(p, 200, 54, 52, 32, (pp) => {
    for (let i = 0; i < 3; i++) { pp.box(204 + i * 16, 62, 12, 16, C.white, C.frame); pp.r(207 + i * 16, 66, 6, 6, C.glassLight); }
  });
  door(p, 262, 68, '#4e6a5e');

  // Kwik Mart: corner store with a striped awning. Door at x 336-352.
  roofline(p, 288, 112, 26);
  brickWall(p, 288, 26, 112, 70, '#9a6a4a', '#7c5238');
  cornice(p, 288, 112, 26, '#5e3e2a');
  sign(p, 344, 33, 'KWIK MART', '#d8432b', C.white);
  awning(p, 292, 104, 48, '#d8432b', C.white);
  shopWindow(p, 294, 62, 38, 24, (pp) => {
    for (let i = 0; i < 4; i++) pp.r(298 + i * 8, 70, 5, 8, ['#e0b040', '#6ab04c', '#e06040', '#4a8ad8'][i]!);
    drawTextCentered(pp, 313, 64, 'OPEN', '#ff6a4a');
  });
  shopWindow(p, 358, 62, 38, 24, (pp) => {
    pp.r(362, 70, 30, 2, C.cream);
    drawTextCentered(pp, 377, 74, 'ATM', C.white);
  });
  door(p, 336, 68, '#2f2a2a');

  // Empty unit with a shutter, then an apartment block with a mural.
  roofline(p, 400, 80, 34);
  sidingWall(p, 400, 34, 80, 62, C.plaster, C.plasterDark);
  sign(p, 440, 42, 'FOR LEASE', C.white, P.ink);
  p.box(408, 56, 64, 38, C.shutter, P.ink);
  for (let y = 59; y < 94; y += 3) p.r(409, y, 62, 1, C.shutterDark);
  drawTextCentered(p, 440, 72, 'TAG', '#d84a8a', 2);

  roofline(p, 480, 80, 14);
  brickWall(p, 480, 14, 80, 82, '#6e5a6a', '#584656');
  cornice(p, 480, 80, 14, '#3e3242');
  // Mural: a big amber record.
  p.r(492, 30, 56, 52, '#2a2440');
  p.r(504, 38, 32, 36, P.ink);
  p.r(500, 42, 40, 28, P.ink);
  p.r(514, 50, 12, 12, P.amber);
  p.r(518, 54, 4, 4, P.ink);
  drawTextCentered(p, 520, 76, 'EASTSIDE', P.amber);

  // Empty lot to the east, toward Midtown.
  p.r(560, 52, 80, 44, '#6f7a56');
  for (let x = 560; x < 640; x += 6) p.r(x, 52, 1, 44, '#5f6a48');
  p.r(560, 50, 80, 3, '#8a8a8a');
  for (let x = 562; x < 640; x += 10) p.r(x, 44, 2, 52, '#8a8a8a');

  ground(p);
  // Crosswalk toward the east end.
  for (let y = CURB_Y + 4; y < STREET_H - 2; y += 6) p.r(600, y, 24, 3, C.white);
}

// ---------- Midtown ----------

function paintMidtown(p: Painter) {
  sky(p);
  // Pocket park on the west end (toward Eastside).
  p.r(0, 60, 80, 36, C.grass);
  for (let x = 2; x < 80; x += 7) p.r(x, 62 + (x % 5), 2, 2, '#6f9e5a');
  p.r(0, 56, 80, 4, '#3e3a36');
  for (let x = 0; x < 80; x += 6) p.r(x, 50, 2, 8, '#3e3a36');

  // Noise Depot: big glass-fronted music store. Door at x 144-160.
  roofline(p, 80, 144, 20);
  sidingWall(p, 80, 20, 144, 76, '#3a3a46', '#30303a');
  cornice(p, 80, 144, 20, '#22222a');
  sign(p, 152, 28, 'NOISE DEPOT', P.amber, P.ink, 2);
  shopWindow(p, 88, 52, 50, 34, (pp) => {
    // Guitars and a keyboard on display.
    pp.r(96, 58, 3, 18, '#c08040'); pp.r(94, 70, 7, 8, '#c08040');
    pp.r(108, 58, 3, 18, '#d8432b'); pp.r(106, 70, 7, 8, '#d8432b');
    pp.box(116, 74, 18, 6, C.white, P.ink);
  });
  shopWindow(p, 166, 52, 50, 34, (pp) => {
    pp.box(172, 60, 12, 20, P.ink, P.ink); pp.r(175, 64, 6, 6, '#555'); pp.r(175, 72, 6, 6, '#555');
    pp.box(198, 60, 12, 20, P.ink, P.ink); pp.r(201, 64, 6, 6, '#555'); pp.r(201, 72, 6, 6, '#555');
    drawTextCentered(pp, 191, 56, 'SALE', '#ff6a4a');
  });
  door(p, 144, 68, '#1d1c22');

  // Grindhouse Café. Door at x 264-280.
  roofline(p, 224, 96, 28);
  brickWall(p, 224, 28, 96, 68, '#7a5a40', '#634830');
  cornice(p, 224, 96, 28, '#4a3424');
  sign(p, 272, 34, 'GRINDHOUSE', C.cream, '#4a3424');
  awning(p, 228, 88, 48, '#2f6a5a', C.cream);
  shopWindow(p, 230, 62, 30, 24, (pp) => { pp.r(236, 76, 6, 4, C.white); pp.r(248, 76, 6, 4, C.white); pp.r(237, 74, 4, 2, '#7a4a2a'); });
  shopWindow(p, 286, 62, 30, 24, (pp) => drawTextCentered(pp, 301, 70, 'COFFEE', C.cream));
  door(p, 264, 68, '#3a5a4a');

  // Vinyl shop (closed for now).
  roofline(p, 320, 80, 34);
  sidingWall(p, 320, 34, 80, 62, C.plum, '#4c3358');
  sign(p, 360, 42, 'WAX RECORDS', C.cream, C.plum);
  shopWindow(p, 328, 58, 64, 28, (pp) => {
    for (let i = 0; i < 4; i++) { pp.r(334 + i * 14, 64, 11, 11, P.ink); pp.r(338 + i * 14, 68, 3, 3, ['#d8432b', P.amber, C.mint, C.white][i]!); }
    drawTextCentered(pp, 360, 78, 'CLOSED', '#ff6a4a');
  });

  // Glass office block.
  roofline(p, 400, 112, 2);
  p.r(400, 2, 112, 94, '#5a7088');
  for (let y = 6; y < 90; y += 12) for (let x = 404; x < 508; x += 13) p.box(x, y, 11, 9, '#7a9ab8', '#46586c');
  p.r(440, 70, 32, 26, '#2f3a48');
  p.r(442, 72, 13, 24, C.glass);
  p.r(457, 72, 13, 24, C.glass);

  // A recording studio (opens up in a later update).
  roofline(p, 512, 128, 24);
  brickWall(p, 512, 24, 128, 72, '#4a4a52', '#3c3c44');
  cornice(p, 512, 128, 24, '#2a2a30');
  sign(p, 576, 32, 'MIDTOWN SOUND', P.red, C.white);
  window2(p, 528, 52, 20, 16);
  window2(p, 604, 52, 20, 16);
  p.box(568, 64, 16, 28, '#2a2a30', P.ink);
  p.r(574, 76, 4, 4, P.red); // "on air" light

  ground(p);
  for (let y = CURB_Y + 4; y < STREET_H - 2; y += 6) p.r(16, y, 24, 3, C.white);
}

// ---------- Street furniture ----------

function paintLamp(p: Painter) {
  // 10 × 56: post with a lamp head at the top.
  p.box(1, 0, 8, 5, P.ink, P.ink);
  p.r(2, 4, 6, 2, '#ffe6a0');
  p.r(4, 6, 2, 46, '#3a3e46');
  p.r(5, 6, 1, 46, '#555a64');
  p.r(2, 52, 6, 4, '#2a2d33');
}

function paintTree(p: Painter) {
  // 28 × 44: street tree in a planter.
  p.r(12, 22, 4, 16, P.woodDark);
  p.r(4, 2, 20, 18, P.leaf);
  p.r(0, 8, 28, 12, P.leaf);
  p.r(6, 0, 16, 4, P.leaf);
  p.r(3, 14, 22, 8, P.leafDark);
  for (let i = 0; i < 6; i++) p.r(4 + i * 4, 4 + (i % 3) * 4, 2, 2, '#58a868');
  p.box(6, 36, 16, 8, '#6e6a60', P.ink);
  p.r(7, 37, 14, 2, '#4a3a2a');
}

function paintBusStop(p: Painter) {
  // 40 × 44: shelter with a bench and a sign post.
  p.r(0, 0, 32, 3, P.ink);
  p.r(1, 1, 30, 1, '#5a6470');
  p.box(1, 3, 30, 24, '#7fa0b880', '#46586c'); // back glass
  p.r(3, 6, 12, 14, '#2a3a50');
  drawTextCentered(p, 9, 8, 'BUS', P.amber);
  p.r(5, 14, 8, 1, C.white);
  p.r(5, 16, 6, 1, C.white);
  p.box(4, 26, 24, 5, P.wood, P.ink); // bench
  p.r(6, 31, 2, 5, P.metalDark);
  p.r(24, 31, 2, 5, P.metalDark);
  p.r(1, 27, 2, 13, P.metalDark);
  p.r(29, 27, 2, 13, P.metalDark);
  // Sign post.
  p.r(35, 6, 2, 38, P.metalDark);
  p.box(31, 0, 10, 10, '#2f6ad8', P.ink);
  drawTextCentered(p, 36, 3, 'B', C.white);
}

function paintTrash(p: Painter) {
  p.box(0, 2, 10, 14, '#3e5a4a', P.ink);
  p.r(0, 0, 10, 3, '#2e4a3a');
  for (let y = 5; y < 15; y += 3) p.r(1, y, 8, 1, '#2e4a3a');
}

function paintHydrant(p: Painter) {
  p.r(2, 0, 4, 2, '#a02818');
  p.box(1, 2, 6, 10, '#d8432b', P.ink);
  p.r(0, 5, 8, 2, '#a02818');
}

function paintBench(p: Painter) {
  p.box(0, 0, 28, 5, P.wood, P.ink);
  p.box(0, 5, 28, 4, P.woodLight, P.ink);
  p.r(2, 9, 2, 4, P.metalDark);
  p.r(24, 9, 2, 4, P.metalDark);
}

function paintSignpost(text: string, arrowLeft: boolean) {
  return (p: Painter) => {
    // 44 × 40
    p.r(21, 10, 2, 30, P.metalDark);
    p.box(0, 0, 44, 11, '#2f7d4a', C.white);
    drawTextCentered(p, 22, 3, arrowLeft ? `< ${text}` : `${text} >`, C.white);
  };
}

function paintCar(color: string, shade: string) {
  return (p: Painter) => {
    // 40 × 20 side view, facing right.
    p.r(4, 16, 32, 3, '#00000040');
    p.box(1, 7, 38, 10, color, P.ink);
    p.box(9, 1, 20, 8, color, P.ink);
    p.r(11, 3, 7, 5, C.glassLight);
    p.r(20, 3, 7, 5, C.glassLight);
    p.r(2, 12, 36, 1, shade);
    p.r(36, 9, 2, 2, '#ffe6a0');
    p.r(2, 9, 2, 2, '#d8432b');
    p.box(6, 14, 7, 6, P.ink, P.ink);
    p.box(27, 14, 7, 6, P.ink, P.ink);
    p.r(8, 16, 3, 2, P.metal);
    p.r(29, 16, 3, 2, P.metal);
  };
}

export const CAR_KEYS = ['car-red', 'car-blue', 'car-cream', 'car-green', 'car-taxi'] as const;

export function registerCityArt(scene: Phaser.Scene): void {
  register(scene, 'street-eastside', STREET_W, STREET_H, paintEastside);
  register(scene, 'street-midtown', STREET_W, STREET_H, paintMidtown);
  register(scene, 'lamp', 10, 56, paintLamp);
  register(scene, 'tree', 28, 44, paintTree);
  register(scene, 'bus-stop', 42, 44, paintBusStop);
  register(scene, 'trash', 10, 16, paintTrash);
  register(scene, 'hydrant', 8, 12, paintHydrant);
  register(scene, 'bench', 28, 13, paintBench);
  register(scene, 'sign-to-midtown', 44, 40, paintSignpost('MIDTOWN', false));
  register(scene, 'sign-to-eastside', 44, 40, paintSignpost('EASTSIDE', true));
  register(scene, 'car-red', 40, 20, paintCar('#c8402a', '#9a2e1e'));
  register(scene, 'car-blue', 40, 20, paintCar('#3f6aa8', '#2e5080'));
  register(scene, 'car-cream', 40, 20, paintCar('#ddd3b4', '#b8ad8e'));
  register(scene, 'car-green', 40, 20, paintCar('#4a7a4a', '#365c36'));
  register(scene, 'car-taxi', 40, 20, paintCar('#e8b830', '#c09020'));
}
