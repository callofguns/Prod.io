import type Phaser from 'phaser';
import { paintCanvas, type Painter } from './painter';
import { P } from './palette';
import { drawTextCentered } from './pixelFont';
import { DOOR_W, DOOR_X, ROOM_H, ROOM_W, TILE } from './apartmentArt';

/** Code-painted shop interiors: the corner store, the gear store and the café. */

function register(scene: Phaser.Scene, key: string, w: number, h: number, paint: (p: Painter) => void) {
  if (scene.textures.exists(key)) return;
  scene.textures.addCanvas(key, paintCanvas(w, h, paint));
}

interface RoomStyle {
  wall: string;
  wallShade: string;
  floor: (p: Painter) => void;
  decorate?: (p: Painter) => void;
}

/** Same footprint as the apartment: 18 × 12 tiles, a back wall, a door in the bottom wall. */
function paintRoom(style: RoomStyle) {
  return (p: Painter) => {
    const { r } = p;
    style.floor(p);
    r(0, 0, ROOM_W, 2 * TILE, style.wall);
    for (let x = 6; x < ROOM_W; x += 12) r(x, 5, 1, 24, style.wallShade);
    r(0, 0, ROOM_W, 4, P.capDark);
    r(0, 4, ROOM_W, 1, P.capLight);
    r(0, 2 * TILE - 3, ROOM_W, 3, P.baseboard);
    style.decorate?.(p);
    r(0, 0, TILE, ROOM_H, P.capDark);
    r(ROOM_W - TILE, 0, TILE, ROOM_H, P.capDark);
    r(TILE - 1, 4, 1, ROOM_H - TILE - 4, P.capLight);
    r(ROOM_W - TILE, 4, 1, ROOM_H - TILE - 4, P.capLight);
    r(0, ROOM_H - TILE, DOOR_X, TILE, P.capDark);
    r(DOOR_X + DOOR_W, ROOM_H - TILE, ROOM_W - DOOR_X - DOOR_W, TILE, P.capDark);
    r(TILE, ROOM_H - TILE, DOOR_X - TILE, 1, P.capLight);
    r(DOOR_X + DOOR_W, ROOM_H - TILE, ROOM_W - DOOR_X - DOOR_W - TILE, 1, P.capLight);
    // Glass door and mat.
    r(DOOR_X, ROOM_H - TILE, DOOR_W, TILE, '#38506a');
    r(DOOR_X + 2, ROOM_H - TILE + 2, DOOR_W - 4, TILE - 4, '#6d8fb0');
    r(DOOR_X + DOOR_W / 2, ROOM_H - TILE, 1, TILE, P.ink);
    r(DOOR_X + 2, ROOM_H - TILE - 10, DOOR_W - 4, 9, '#3a3a40');
  };
}

const tiles = (a: string, b: string) => (p: Painter) => {
  for (let y = 0; y < ROOM_H; y += 16) for (let x = 0; x < ROOM_W; x += 16) p.r(x, y, 16, 16, ((x + y) / 16) % 2 ? a : b);
};

const planks = (base: string, dark: string) => (p: Painter) => {
  p.r(0, 0, ROOM_W, ROOM_H, base);
  for (let y = 0; y < ROOM_H; y += 6) {
    p.r(0, y + 5, ROOM_W, 1, dark);
    for (let x = ((y / 6) % 4) * 17; x < ROOM_W; x += 70) p.r(x, y, 1, 5, dark);
  }
};

const concrete = (p: Painter) => {
  p.r(0, 0, ROOM_W, ROOM_H, '#55555c');
  for (let i = 0; i < 260; i++) p.r((i * 97) % ROOM_W, (i * 53) % ROOM_H, 1, 1, i % 2 ? '#4a4a50' : '#606068');
  // A rug in front of the counter.
  p.box(192, 138, 72, 18, '#8f342b', P.ink);
  p.r(196, 142, 64, 1, '#d8432b');
  p.r(196, 151, 64, 1, '#d8432b');
};

// ---------- Kwik Mart ----------

function paintGroceryWall(p: Painter) {
  // Drinks coolers along the back wall.
  for (let i = 0; i < 4; i++) {
    const x = 24 + i * 34;
    p.box(x, 4, 32, 28, '#9fc4d8', P.ink);
    for (let s = 0; s < 3; s++) {
      p.r(x + 1, 10 + s * 7, 30, 1, '#6a8a9a');
      for (let c = 0; c < 7; c++) p.r(x + 3 + c * 4, 6 + s * 7, 2, 4, ['#d8432b', '#4a8ad8', '#e0b040', '#6ab04c'][(c + s + i) % 4]!);
    }
  }
  p.box(178, 6, 70, 12, '#d8432b', P.ink);
  drawTextCentered(p, 213, 9, 'KWIK MART', '#ffffff');
}

function paintShelf(p: Painter) {
  // 64 × 30: a double-sided aisle shelf seen from above-front.
  p.box(0, 0, 64, 8, '#c9c3b0', P.ink);
  p.box(0, 8, 64, 22, '#d8d2bf', P.ink);
  const colors = ['#d8432b', '#e0b040', '#4a8ad8', '#6ab04c', '#a05ad8', '#f2efe6'];
  for (let s = 0; s < 3; s++) {
    p.r(1, 15 + s * 6, 62, 1, '#9a9480');
    for (let i = 0; i < 12; i++) p.r(3 + i * 5, 10 + s * 6, 3, 5, colors[(i * 7 + s * 3) % colors.length]!);
  }
  for (let i = 0; i < 10; i++) p.r(4 + i * 6, 2, 4, 4, colors[(i * 5) % colors.length]!);
}

function paintRegister(p: Painter) {
  // 56 × 28 checkout counter with a till and gum rack.
  p.box(0, 8, 56, 20, '#7a5a40', P.ink);
  p.box(0, 6, 56, 8, '#c9c3b0', P.ink);
  p.box(6, 0, 14, 10, '#2c2a33', P.ink);
  p.r(8, 2, 10, 4, '#7fd1c4');
  p.box(38, 0, 14, 8, '#e0b040', P.ink);
  for (let i = 0; i < 3; i++) p.r(40 + i * 4, 2, 2, 4, ['#d8432b', '#4a8ad8', '#6ab04c'][i]!);
}

// ---------- Noise Depot ----------

function paintGearWall(p: Painter) {
  p.r(16, 4, 256, 28, '#2a2a32');
  // Guitars hanging on the wall.
  const guitars = ['#c08040', '#d8432b', '#2c2a33', '#e0b040', '#4a8ad8', '#f2efe6'];
  guitars.forEach((c, i) => {
    const x = 24 + i * 16;
    p.r(x + 3, 6, 2, 14, '#8a5d3f');
    p.box(x, 18, 8, 12, c, P.ink);
    p.r(x + 3, 22, 2, 2, P.ink);
  });
  // Neon sign.
  p.box(132, 8, 64, 14, P.ink, P.amber);
  drawTextCentered(p, 164, 12, 'NOISE DEPOT', P.amber);
  // Headphones wall.
  for (let i = 0; i < 4; i++) {
    const x = 206 + i * 16;
    p.r(x + 1, 10, 10, 2, '#9aa0a8');
    p.r(x, 11, 3, 8, ['#2c2a33', '#d8432b', '#f2efe6', '#4a8ad8'][i]!);
    p.r(x + 9, 11, 3, 8, ['#2c2a33', '#d8432b', '#f2efe6', '#4a8ad8'][i]!);
  }
}

function paintKeyboardTable(p: Painter) {
  // 56 × 26: display table with two MIDI keyboards.
  p.box(0, 6, 56, 20, '#2c2a33', P.ink);
  for (const x of [4, 30]) {
    p.box(x, 0, 22, 9, P.white, P.ink);
    for (let k = x + 2; k < x + 20; k += 2) p.r(k, 1, 1, 5, '#6b7078');
    p.r(x + 1, 6, 20, 2, '#2c2a33');
  }
  p.r(2, 20, 52, 1, P.amber);
}

function paintSpeakerShelf(p: Painter) {
  // 56 × 34: studio monitors and interfaces on a shelf.
  p.box(0, 0, 56, 34, '#3a3a44', P.ink);
  p.r(1, 16, 54, 2, P.ink);
  for (const x of [4, 20, 36]) {
    p.box(x, 2, 14, 13, '#1d1c22', P.ink);
    p.r(x + 4, 4, 6, 6, '#555a64');
    p.r(x + 6, 6, 2, 2, '#888');
  }
  for (const x of [4, 30]) {
    p.box(x, 22, 22, 9, '#b8432b', P.ink);
    p.r(x + 3, 25, 3, 3, '#ffe6a0');
    p.r(x + 9, 25, 3, 3, '#ffe6a0');
  }
}

function paintGearCounter(p: Painter) {
  // 64 × 28.
  p.box(0, 8, 64, 20, '#3a3a44', P.ink);
  p.box(0, 6, 64, 8, '#55555c', P.ink);
  p.box(8, 0, 14, 10, '#2c2a33', P.ink);
  p.r(10, 2, 10, 4, P.amber);
  p.r(40, 2, 18, 6, '#e8e4d8'); // a stack of boxes
  p.r(40, 4, 18, 1, '#b8b2a2');
}

// ---------- Grindhouse Café ----------

function paintCafeWall(p: Painter) {
  // Menu boards and shelves of cups.
  p.box(24, 6, 76, 22, '#1f2a24', '#4a3424');
  drawTextCentered(p, 62, 9, 'MENU', '#efe3c2');
  for (let i = 0; i < 3; i++) p.r(30, 16 + i * 3, 40 + (i % 2) * 14, 1, '#cfc7ad');
  p.box(188, 6, 76, 22, '#1f2a24', '#4a3424');
  drawTextCentered(p, 226, 9, 'GRINDHOUSE', '#efe3c2');
  for (let i = 0; i < 3; i++) p.r(196, 16 + i * 3, 30 + (i % 2) * 20, 1, '#cfc7ad');
  for (let i = 0; i < 6; i++) p.r(112 + i * 10, 12, 6, 6, i % 2 ? '#f2efe6' : '#2f6a5a');
  p.r(108, 18, 72, 2, '#6b4630');
}

function paintCafeCounter(p: Painter) {
  // 112 × 30: long counter with an espresso machine and pastry case.
  p.box(0, 10, 112, 20, '#6b4630', P.ink);
  p.box(0, 8, 112, 7, '#d9cdb0', P.ink);
  p.box(10, 0, 22, 12, '#9aa0a8', P.ink); // espresso machine
  p.r(13, 3, 16, 3, '#6b7078');
  p.r(16, 8, 2, 3, P.ink);
  p.r(24, 8, 2, 3, P.ink);
  p.box(70, 0, 30, 11, '#bcd8e080', P.ink); // pastry case
  for (let i = 0; i < 5; i++) p.r(73 + i * 5, 6, 4, 3, ['#d9a441', '#b8582e', '#efe3c2'][i % 3]!);
  p.box(44, 2, 12, 9, '#2c2a33', P.ink); // till
  p.r(46, 4, 8, 3, '#7fd1c4');
  for (let x = 4; x < 110; x += 12) p.r(x, 20, 6, 1, '#8a5d3f');
}

function paintCafeTable(p: Painter) {
  // 36 × 26: round-ish table with two stools and two cups.
  p.box(8, 0, 20, 14, '#8a5d3f', P.ink);
  p.r(10, 2, 16, 2, '#a3734f');
  p.r(12, 6, 4, 3, P.white);
  p.r(20, 7, 4, 3, P.white);
  p.r(17, 14, 2, 6, P.woodDark);
  p.box(0, 14, 8, 8, '#2f6a5a', P.ink);
  p.box(28, 14, 8, 8, '#2f6a5a', P.ink);
  p.r(3, 22, 2, 4, P.ink);
  p.r(31, 22, 2, 4, P.ink);
}

export function registerInteriorArt(scene: Phaser.Scene): void {
  register(scene, 'room-grocery', ROOM_W, ROOM_H, paintRoom({ wall: '#d9dccf', wallShade: '#c6c9bc', floor: tiles('#e6e2d6', '#c9c4b4'), decorate: paintGroceryWall }));
  register(scene, 'room-gear', ROOM_W, ROOM_H, paintRoom({ wall: '#3a3a46', wallShade: '#30303a', floor: concrete, decorate: paintGearWall }));
  register(scene, 'room-cafe', ROOM_W, ROOM_H, paintRoom({ wall: '#c9b89a', wallShade: '#b6a586', floor: planks('#9a6a45', '#7a4f33'), decorate: paintCafeWall }));
  register(scene, 'shelf', 64, 30, paintShelf);
  register(scene, 'register', 56, 28, paintRegister);
  register(scene, 'keyboard-table', 56, 26, paintKeyboardTable);
  register(scene, 'speaker-shelf', 56, 34, paintSpeakerShelf);
  register(scene, 'gear-counter', 64, 28, paintGearCounter);
  register(scene, 'cafe-counter', 112, 30, paintCafeCounter);
  register(scene, 'cafe-table', 36, 26, paintCafeTable);
}
