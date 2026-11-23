import type Phaser from 'phaser';
import { paintCanvas, type Painter } from './painter';
import { P } from './palette';

export const TILE = 16;
export const ROOM_COLS = 18;
export const ROOM_ROWS = 12;
export const ROOM_W = ROOM_COLS * TILE;
export const ROOM_H = ROOM_ROWS * TILE;
/** Pixel x-range of the doorway in the bottom wall. */
export const DOOR_X = 8 * TILE;
export const DOOR_W = 2 * TILE;

/** Registers a painted canvas as a texture (no-op if it already exists). */
function register(scene: Phaser.Scene, key: string, w: number, h: number, paint: (p: Painter) => void) {
  if (scene.textures.exists(key)) return;
  scene.textures.addCanvas(key, paintCanvas(w, h, paint));
}

function paintRoomBackground(p: Painter) {
  const { r } = p;
  // Floor: horizontal planks with staggered seams.
  r(0, 0, ROOM_W, ROOM_H, P.floor);
  for (let y = 0; y < ROOM_H; y += 4) {
    r(0, y + 3, ROOM_W, 1, P.floorDark);
    const offset = ((y / 4) % 3) * 21;
    for (let x = offset; x < ROOM_W; x += 64) r(x, y, 1, 3, P.floorDark);
    if ((y / 4) % 5 === 2) r(0, y, ROOM_W, 1, P.floorLight);
  }

  // Rug in the middle of the room.
  const rx = 96, ry = 100, rw = 96, rh = 56;
  r(rx, ry, rw, rh, P.rugDark);
  r(rx + 2, ry + 2, rw - 4, rh - 4, P.rug);
  r(rx + 6, ry + 6, rw - 12, 1, P.rugLight);
  r(rx + 6, ry + rh - 7, rw - 12, 1, P.rugLight);
  r(rx + 6, ry + 6, 1, rh - 12, P.rugLight);
  r(rx + rw - 7, ry + 6, 1, rh - 12, P.rugLight);
  for (let i = 0; i < 5; i++) r(rx + 30 + i * 8, ry + 24, 4, 8, P.rugLight);

  // Back wall face (rows 0-1) with a dark cap and baseboard.
  r(0, 0, ROOM_W, 2 * TILE, P.wall);
  for (let x = 6; x < ROOM_W; x += 12) r(x, 5, 1, 24, P.wallShade);
  r(0, 0, ROOM_W, 4, P.capDark);
  r(0, 4, ROOM_W, 1, P.capLight);
  r(0, 2 * TILE - 3, ROOM_W, 3, P.baseboard);

  // Poster on the wall between desk and kitchen.
  p.box(184, 6, 16, 20, P.ink, P.ink);
  r(185, 7, 14, 18, '#2b2440');
  r(187, 9, 10, 10, P.amber);
  r(189, 11, 6, 6, P.red);
  r(187, 21, 10, 1, P.white);
  r(187, 23, 6, 1, P.white);

  // Side walls and bottom wall (top-down caps), with a doorway gap.
  r(0, 0, TILE, ROOM_H, P.capDark);
  r(ROOM_W - TILE, 0, TILE, ROOM_H, P.capDark);
  r(TILE - 1, 4, 1, ROOM_H - TILE - 4, P.capLight);
  r(ROOM_W - TILE, 4, 1, ROOM_H - TILE - 4, P.capLight);
  r(0, ROOM_H - TILE, DOOR_X, TILE, P.capDark);
  r(DOOR_X + DOOR_W, ROOM_H - TILE, ROOM_W - DOOR_X - DOOR_W, TILE, P.capDark);
  r(TILE, ROOM_H - TILE, DOOR_X - TILE, 1, P.capLight);
  r(DOOR_X + DOOR_W, ROOM_H - TILE, ROOM_W - DOOR_X - DOOR_W - TILE, 1, P.capLight);

  // Doorway: threshold and doormat.
  r(DOOR_X, ROOM_H - TILE, DOOR_W, TILE, P.woodDark);
  r(DOOR_X + 2, ROOM_H - TILE + 2, DOOR_W - 4, TILE - 4, '#5a3c2c');
  r(DOOR_X + 2, ROOM_H - TILE - 10, DOOR_W - 4, 9, '#4a4f3a');
  for (let x = DOOR_X + 4; x < DOOR_X + DOOR_W - 4; x += 3) r(x, ROOM_H - TILE - 8, 1, 5, '#5f6649');
}

function paintWindowFrame(p: Painter) {
  // 36 x 22, glass area left transparent so the sky rectangle shows through.
  const { r } = p;
  r(0, 0, 36, 22, P.white);
  p.ctx.clearRect(2, 2, 15, 16);
  p.ctx.clearRect(19, 2, 15, 16);
  r(0, 18, 36, 4, P.sheetShade);
  r(0, 21, 36, 1, P.ink);
}

function paintBed(p: Painter) {
  // 32 x 48, headboard at the top.
  const { r } = p;
  p.box(0, 0, 32, 10, P.wood, P.ink);
  r(2, 2, 28, 2, P.woodLight);
  p.box(0, 8, 32, 40, P.sheet, P.ink);
  r(4, 11, 24, 8, P.white); // pillow
  r(4, 18, 24, 1, P.sheetShade);
  p.box(1, 22, 30, 25, P.blanket, P.ink);
  r(2, 23, 28, 2, '#5577aa');
  for (let y = 28; y < 46; y += 5) r(2, y, 28, 1, P.blanketShade);
  r(1, 46, 30, 2, P.woodDark);
}

function paintNightstand(p: Painter) {
  // 16 x 28: lamp on a small cabinet.
  const { r } = p;
  r(6, 10, 4, 4, P.metalDark); // lamp stem
  p.box(3, 2, 10, 9, P.amber, P.ink); // shade
  r(4, 3, 8, 2, '#ffd28a');
  p.box(0, 13, 16, 15, P.wood, P.ink);
  r(1, 14, 14, 2, P.woodLight);
  r(2, 19, 12, 1, P.woodDark);
  r(7, 21, 2, 1, P.metal);
}

function paintDesk(p: Painter) {
  // 64 x 40: monitor, speakers and a MIDI keyboard on a desk.
  const { r } = p;
  // Monitor
  p.box(18, 0, 28, 18, P.ink, P.ink);
  r(20, 2, 24, 13, P.screen);
  r(21, 4, 12, 1, P.screenGlow);
  r(21, 6, 18, 1, '#4f7fa8');
  r(21, 8, 8, 1, P.amber);
  r(30, 8, 10, 1, P.screenGlow);
  r(21, 10, 16, 1, '#4f7fa8');
  r(30, 18, 4, 4, P.metalDark);
  // Speakers
  p.box(4, 6, 10, 16, '#2c2a33', P.ink);
  r(7, 9, 4, 4, P.metalDark);
  r(7, 15, 4, 4, P.metalDark);
  p.box(50, 6, 10, 16, '#2c2a33', P.ink);
  r(53, 9, 4, 4, P.metalDark);
  r(53, 15, 4, 4, P.metalDark);
  // Desk top
  p.box(0, 20, 64, 14, P.woodLight, P.ink);
  r(1, 21, 62, 2, '#a3734f');
  // MIDI keyboard
  p.box(16, 24, 32, 7, P.white, P.ink);
  for (let x = 19; x < 46; x += 3) r(x, 25, 1, 5, P.metalDark);
  r(17, 25, 2, 5, '#2c2a33');
  // Front and legs
  r(0, 33, 64, 3, P.wood);
  r(1, 36, 3, 4, P.woodDark);
  r(60, 36, 3, 4, P.woodDark);
}

function paintChair(p: Painter) {
  // 16 x 20 office chair seen from behind.
  const { r } = p;
  p.box(2, 0, 12, 11, '#2c2a33', P.ink);
  r(4, 2, 8, 1, '#45424f');
  p.box(1, 10, 14, 5, '#2c2a33', P.ink);
  r(7, 15, 2, 3, P.metalDark);
  r(3, 18, 10, 2, P.ink);
}

function paintCounter(p: Painter) {
  // 48 x 34: stove and sink.
  const { r } = p;
  p.box(0, 8, 48, 26, P.wood, P.ink);
  p.box(0, 8, 48, 12, '#cfcabc', P.ink);
  // Stove
  r(4, 10, 18, 8, '#3a3842');
  r(6, 11, 5, 3, P.metalDark);
  r(14, 11, 5, 3, P.metalDark);
  r(6, 15, 5, 2, P.metalDark);
  r(14, 15, 5, 2, P.metalDark);
  // Sink
  p.box(28, 10, 16, 8, P.metal, P.ink);
  r(30, 12, 12, 4, '#7f8790');
  r(35, 6, 2, 5, P.metalDark);
  // Cabinet doors
  r(23, 21, 1, 12, P.woodDark);
  r(19, 26, 2, 1, P.metal);
  r(26, 26, 2, 1, P.metal);
  r(1, 21, 46, 1, P.woodLight);
}

function paintFridge(p: Painter) {
  // 16 x 46
  const { r } = p;
  p.box(0, 0, 16, 46, P.fridge, P.ink);
  r(1, 1, 14, 2, P.white);
  r(1, 17, 14, 1, P.ink);
  r(12, 6, 1, 8, P.metalDark);
  r(12, 21, 1, 12, P.metalDark);
  r(1, 40, 14, 5, P.fridgeShade);
  r(4, 7, 3, 3, P.amber); // a magnet
}

function paintCouch(p: Painter) {
  // 48 x 26, seen from behind (facing the rug).
  const { r } = p;
  p.box(0, 4, 48, 22, P.couch, P.ink);
  p.box(0, 0, 8, 26, P.couchShade, P.ink);
  p.box(40, 0, 8, 26, P.couchShade, P.ink);
  r(9, 6, 30, 2, '#6d5c90');
  r(23, 5, 1, 19, P.couchShade);
  r(9, 22, 30, 3, P.couchShade);
}

function paintPlant(p: Painter) {
  // 14 x 24
  const { r } = p;
  r(6, 0, 2, 3, P.leaf);
  r(2, 2, 4, 4, P.leaf);
  r(8, 2, 4, 4, P.leaf);
  r(4, 5, 6, 6, P.leafDark);
  r(1, 7, 4, 4, P.leaf);
  r(9, 7, 4, 4, P.leaf);
  r(5, 3, 1, 8, P.leafDark);
  p.box(2, 12, 10, 12, P.pot, P.ink);
  r(3, 13, 8, 2, '#c98450');
}

function paintGlow(p: Painter) {
  // 64 x 64 radial glow, used with additive blending for lamps and screens.
  const g = p.ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,200,120,0.9)');
  g.addColorStop(0.4, 'rgba(255,170,80,0.35)');
  g.addColorStop(1, 'rgba(255,150,60,0)');
  p.ctx.fillStyle = g;
  p.ctx.fillRect(0, 0, 64, 64);
}

function paintShadow(p: Painter) {
  p.ctx.fillStyle = 'rgba(15,10,20,0.35)';
  p.ctx.beginPath();
  p.ctx.ellipse(6, 2.5, 6, 2.5, 0, 0, Math.PI * 2);
  p.ctx.fill();
}

export function registerApartmentArt(scene: Phaser.Scene): void {
  register(scene, 'room-bg', ROOM_W, ROOM_H, paintRoomBackground);
  register(scene, 'window-frame', 36, 22, paintWindowFrame);
  register(scene, 'bed', 32, 48, paintBed);
  register(scene, 'nightstand', 16, 28, paintNightstand);
  register(scene, 'desk', 64, 40, paintDesk);
  register(scene, 'chair', 16, 20, paintChair);
  register(scene, 'counter', 48, 34, paintCounter);
  register(scene, 'fridge', 16, 46, paintFridge);
  register(scene, 'couch', 48, 26, paintCouch);
  register(scene, 'plant', 14, 24, paintPlant);
  register(scene, 'glow', 64, 64, paintGlow);
  register(scene, 'shadow', 12, 5, paintShadow);
}
