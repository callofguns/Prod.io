import type Phaser from 'phaser';
import type { Facing } from '../../sim/core/state';
import type { AreaId } from '../../content/city';
import type { LookChoice } from '../../content/looks';
import type { Rect } from '../pathfinding';
import { registerApartmentArt, ROOM_H, ROOM_W, TILE, DOOR_X, DOOR_W } from '../art/apartmentArt';
import { registerCityArt, CURB_Y, FACADE_BOTTOM, STREET_H, STREET_W } from '../art/cityArt';
import { registerInteriorArt } from '../art/interiorArt';

/**
 * Everything the world scene needs to build one area: its art, solid
 * shapes, usable objects, spawn points and lighting. The simulation decides
 * which area you're in; this file decides what it looks like.
 */
export interface Interactable {
  id: string;
  label: string;
  /** Where the player's feet must be to use it. */
  zone: Rect;
  /** What you can tap on screen to walk over and use it (sprite bounds). */
  tapAreas: Rect[];
}

export interface Spawn {
  x: number;
  y: number;
  facing: Facing;
}

export interface PropDef {
  key: string;
  x: number;
  y: number;
  /** Defaults to the sprite's bottom edge (y-sorting). */
  depth?: number;
  flipX?: boolean;
}

export interface NpcDef {
  key: string;
  look: LookChoice;
  x: number;
  y: number;
  facing: Facing;
}

export interface AreaLayout {
  width: number;
  height: number;
  register(scene: Phaser.Scene): void;
  background: string;
  props: PropDef[];
  colliders: Rect[];
  interactables: Interactable[];
  spawns: Record<string, Spawn>;
  defaultSpawn: string;
  /** home: a window and lamps; shop: lights always on; street: lamp posts at night. */
  lighting: 'home' | 'shop' | 'street';
  lights: { x: number; y: number; scale: number; tint?: number }[];
  npcs: NpcDef[];
  /** Streets only: traffic lanes (car y) and the sidewalk band pedestrians use. */
  street?: { lanes: number[]; walkY: [number, number] };
}

const grow = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 });
const BOTTOM = ROOM_H - TILE;

/** Walls shared by every 18 × 12 room with a door in the middle of the bottom wall. */
const roomWalls = (): Rect[] => [
  { x: 0, y: 0, w: ROOM_W, h: 2 * TILE + 2 },
  { x: 0, y: 0, w: TILE, h: ROOM_H },
  { x: ROOM_W - TILE, y: 0, w: TILE, h: ROOM_H },
  { x: 0, y: BOTTOM, w: DOOR_X, h: TILE },
  { x: DOOR_X + DOOR_W, y: BOTTOM, w: ROOM_W - DOOR_X - DOOR_W, h: TILE },
  { x: DOOR_X, y: ROOM_H - 4, w: DOOR_W, h: 4 },
];

const roomDoor = (id: string, label: string): Interactable => ({
  id, label, zone: { x: DOOR_X - 4, y: BOTTOM - 14, w: DOOR_W + 8, h: 20 },
  tapAreas: [{ x: DOOR_X, y: BOTTOM - 10, w: DOOR_W, h: TILE + 10 }],
});
const DOOR_SPAWN: Spawn = { x: DOOR_X + DOOR_W / 2, y: BOTTOM - 6, facing: 'up' };

// ---------- Apartment ----------

const apartment: AreaLayout = {
  width: ROOM_W,
  height: ROOM_H,
  register: registerApartmentArt,
  background: 'room-bg',
  props: [
    { key: 'bed', x: 16, y: 30 },
    { key: 'nightstand', x: 50, y: 22 },
    { key: 'desk', x: 112, y: 16 },
    { key: 'chair', x: 136, y: 52, depth: 62 },
    { key: 'counter', x: 208, y: 20 },
    { key: 'fridge', x: 256, y: 8 },
    { key: 'couch', x: 24, y: 140 },
    { key: 'plant', x: 252, y: 142 },
  ],
  colliders: [
    ...roomWalls(),
    { x: 16, y: 34, w: 32, h: 44 }, // bed
    { x: 50, y: 40, w: 16, h: 10 }, // nightstand
    { x: 112, y: 38, w: 64, h: 16 }, // desk
    { x: 208, y: 34, w: 48, h: 20 }, // counter
    { x: 256, y: 34, w: 16, h: 20 }, // fridge
    { x: 138, y: 64, w: 12, h: 8 }, // desk chair
    { x: 24, y: 146, w: 48, h: 18 }, // couch
    { x: 254, y: 160, w: 10, h: 6 }, // plant
  ],
  interactables: [
    { id: 'bed', label: 'Sleep', zone: grow({ x: 16, y: 34, w: 32, h: 44 }, 10), tapAreas: [{ x: 16, y: 30, w: 32, h: 48 }] },
    {
      id: 'computer', label: 'Use computer', zone: grow({ x: 112, y: 38, w: 64, h: 16 }, 12),
      tapAreas: [{ x: 112, y: 16, w: 64, h: 40 }, { x: 136, y: 52, w: 16, h: 20 }],
    },
    { id: 'stove', label: 'Cook', zone: grow({ x: 208, y: 34, w: 40, h: 20 }, 10), tapAreas: [{ x: 208, y: 20, w: 48, h: 34 }] },
    { id: 'fridge', label: 'Open fridge', zone: grow({ x: 256, y: 34, w: 16, h: 20 }, 10), tapAreas: [{ x: 256, y: 8, w: 16, h: 46 }] },
    roomDoor('door', 'Go outside'),
  ],
  spawns: {
    start: { x: 152, y: 124, facing: 'down' },
    bed: { x: 34, y: 96, facing: 'down' },
    door: DOOR_SPAWN,
  },
  defaultSpawn: 'start',
  lighting: 'home',
  lights: [{ x: 58, y: 28, scale: 1.4 }, { x: 144, y: 26, scale: 1.1, tint: 0x88e0ff }],
  npcs: [],
};

// ---------- Streets ----------

const WALK_TOP = FACADE_BOTTOM + 5;
const WALK_BOTTOM = CURB_Y - 4;
const LANES = [CURB_Y + 16, CURB_Y + 38];

const streetColliders = (extra: Rect[]): Rect[] => [
  { x: 0, y: 0, w: STREET_W, h: FACADE_BOTTOM }, // building fronts
  { x: 0, y: CURB_Y - 2, w: STREET_W, h: STREET_H - CURB_Y + 2 }, // the road
  { x: -4, y: 0, w: 6, h: STREET_H },
  { x: STREET_W - 2, y: 0, w: 6, h: STREET_H },
  ...extra,
];

/** A street door: stand on the step below it. */
const streetDoor = (id: string, label: string, x: number): Interactable => ({
  id, label, zone: { x: x - 6, y: FACADE_BOTTOM, w: 28, h: 18 },
  tapAreas: [{ x: x - 2, y: FACADE_BOTTOM - 30, w: 20, h: 40 }],
});
const doorSpawn = (x: number): Spawn => ({ x: x + 8, y: FACADE_BOTTOM + 12, facing: 'down' });

const BUS_X_EAST = 430;
const BUS_X_MID = 400;
const busStop = (x: number): Interactable => ({
  id: 'busStop', label: 'Bus stop', zone: { x: x - 6, y: WALK_TOP, w: 54, h: WALK_BOTTOM - WALK_TOP },
  tapAreas: [{ x, y: WALK_TOP + 2, w: 42, h: 40 }],
});
const busProps = (x: number): PropDef[] => [{ key: 'bus-stop', x, y: WALK_BOTTOM - 44 + 4 }];
const busColliders = (x: number): Rect[] => [{ x: x, y: WALK_BOTTOM - 14, w: 32, h: 6 }, { x: x + 34, y: WALK_BOTTOM - 4, w: 4, h: 4 }];

const lamp = (x: number): PropDef => ({ key: 'lamp', x, y: WALK_BOTTOM - 52 });
const lampCollider = (x: number): Rect => ({ x: x + 3, y: WALK_BOTTOM - 3, w: 4, h: 3 });
const lampLight = (x: number) => ({ x: x + 5, y: WALK_BOTTOM - 48, scale: 1.3 });

const eastLamps = [60, 220, 380, 540];
const eastside: AreaLayout = {
  width: STREET_W,
  height: STREET_H,
  register: registerCityArt,
  background: 'street-eastside',
  props: [
    ...eastLamps.map(lamp),
    ...busProps(BUS_X_EAST),
    { key: 'tree', x: 168, y: WALK_BOTTOM - 40 },
    { key: 'tree', x: 488, y: WALK_BOTTOM - 40 },
    { key: 'trash', x: 300, y: WALK_BOTTOM - 14 },
    { key: 'hydrant', x: 404, y: WALK_BOTTOM - 10 },
    { key: 'sign-to-midtown', x: 584, y: WALK_TOP - 4 },
  ],
  colliders: streetColliders([
    ...eastLamps.map(lampCollider),
    ...busColliders(BUS_X_EAST),
    { x: 174, y: WALK_BOTTOM - 6, w: 16, h: 6 },
    { x: 494, y: WALK_BOTTOM - 6, w: 16, h: 6 },
    { x: 300, y: WALK_BOTTOM - 5, w: 10, h: 5 },
    { x: 404, y: WALK_BOTTOM - 4, w: 8, h: 4 },
  ]),
  interactables: [
    streetDoor('homeDoor', 'Go home', 104),
    streetDoor('groceryDoor', 'Kwik Mart', 336),
    busStop(BUS_X_EAST),
    { id: 'toMidtown', label: 'Walk to Midtown', zone: { x: 596, y: WALK_TOP, w: 44, h: WALK_BOTTOM - WALK_TOP }, tapAreas: [{ x: 584, y: WALK_TOP - 4, w: 56, h: 40 }] },
  ],
  spawns: {
    home: doorSpawn(104),
    grocery: doorSpawn(336),
    busStop: { x: BUS_X_EAST + 50, y: WALK_TOP + 22, facing: 'left' },
    curb: { x: 250, y: WALK_BOTTOM - 4, facing: 'up' },
    edge: { x: 580, y: WALK_TOP + 20, facing: 'left' },
  },
  defaultSpawn: 'home',
  lighting: 'street',
  lights: eastLamps.map(lampLight),
  npcs: [],
  street: { lanes: LANES, walkY: [WALK_TOP + 4, WALK_BOTTOM - 4] },
};

const midLamps = [100, 260, 460, 600];
const midtown: AreaLayout = {
  width: STREET_W,
  height: STREET_H,
  register: registerCityArt,
  background: 'street-midtown',
  props: [
    ...midLamps.map(lamp),
    ...busProps(BUS_X_MID),
    { key: 'sign-to-eastside', x: 12, y: WALK_TOP - 4 },
    { key: 'bench', x: 200, y: WALK_TOP + 2 },
    { key: 'tree', x: 336, y: WALK_BOTTOM - 40 },
    { key: 'tree', x: 528, y: WALK_BOTTOM - 40 },
    { key: 'trash', x: 228, y: WALK_BOTTOM - 14 },
  ],
  colliders: streetColliders([
    ...midLamps.map(lampCollider),
    ...busColliders(BUS_X_MID),
    { x: 200, y: WALK_TOP + 6, w: 28, h: 8 },
    { x: 342, y: WALK_BOTTOM - 6, w: 16, h: 6 },
    { x: 534, y: WALK_BOTTOM - 6, w: 16, h: 6 },
    { x: 228, y: WALK_BOTTOM - 5, w: 10, h: 5 },
  ]),
  interactables: [
    streetDoor('gearStoreDoor', 'Noise Depot', 144),
    streetDoor('cafeDoor', 'Grindhouse Café', 264),
    busStop(BUS_X_MID),
    { id: 'toEastside', label: 'Walk to Eastside', zone: { x: 0, y: WALK_TOP, w: 44, h: WALK_BOTTOM - WALK_TOP }, tapAreas: [{ x: 0, y: WALK_TOP - 4, w: 56, h: 40 }] },
  ],
  spawns: {
    gearStore: doorSpawn(144),
    cafe: doorSpawn(264),
    busStop: { x: BUS_X_MID + 50, y: WALK_TOP + 22, facing: 'left' },
    curb: { x: 300, y: WALK_BOTTOM - 4, facing: 'up' },
    edge: { x: 60, y: WALK_TOP + 20, facing: 'right' },
  },
  defaultSpawn: 'busStop',
  lighting: 'street',
  lights: midLamps.map(lampLight),
  npcs: [],
  street: { lanes: LANES, walkY: [WALK_TOP + 4, WALK_BOTTOM - 4] },
};

// ---------- Shops ----------

const clerk = (key: string, x: number, y: number, look: Partial<LookChoice>): NpcDef => ({
  key, x, y, facing: 'down',
  look: { skin: 'tone3', hairStyle: 'short', hairColor: 'black', top: 'tee', topColor: 'red', pantsColor: 'navy', ...look },
});

const grocery: AreaLayout = {
  width: ROOM_W,
  height: ROOM_H,
  register: registerInteriorArt,
  background: 'room-grocery',
  props: [
    { key: 'shelf', x: 28, y: 52 },
    { key: 'shelf', x: 108, y: 52 },
    { key: 'shelf', x: 28, y: 104 },
    { key: 'register', x: 200, y: 116 },
  ],
  colliders: [
    ...roomWalls(),
    { x: 28, y: 60, w: 64, h: 22 },
    { x: 108, y: 60, w: 64, h: 22 },
    { x: 28, y: 112, w: 64, h: 22 },
    { x: 200, y: 124, w: 56, h: 20 },
    { x: 212, y: 96, w: 40, h: 26 }, // behind the counter
  ],
  interactables: [
    roomDoor('exit', 'Go outside'),
    { id: 'groceryCounter', label: 'Checkout', zone: { x: 194, y: 142, w: 68, h: 20 }, tapAreas: [{ x: 200, y: 96, w: 56, h: 48 }] },
  ],
  spawns: { door: DOOR_SPAWN },
  defaultSpawn: 'door',
  lighting: 'shop',
  lights: [],
  npcs: [clerk('npc-grocer', 228, 120, { skin: 'tone4', hairStyle: 'cap', topColor: 'red' })],
};

const gearStore: AreaLayout = {
  width: ROOM_W,
  height: ROOM_H,
  register: registerInteriorArt,
  background: 'room-gear',
  props: [
    { key: 'keyboard-table', x: 32, y: 62 },
    { key: 'keyboard-table', x: 32, y: 118 },
    { key: 'speaker-shelf', x: 108, y: 40 },
    { key: 'gear-counter', x: 196, y: 108 },
  ],
  colliders: [
    ...roomWalls(),
    { x: 32, y: 68, w: 56, h: 20 },
    { x: 32, y: 124, w: 56, h: 20 },
    { x: 108, y: 44, w: 56, h: 30 },
    { x: 196, y: 116, w: 64, h: 20 },
    { x: 206, y: 84, w: 48, h: 30 },
  ],
  interactables: [
    roomDoor('exit', 'Go outside'),
    { id: 'gearCounter', label: 'Browse gear', zone: { x: 190, y: 134, w: 76, h: 22 }, tapAreas: [{ x: 196, y: 88, w: 64, h: 48 }, { x: 32, y: 56, w: 56, h: 90 }, { x: 108, y: 40, w: 56, h: 34 }] },
  ],
  spawns: { door: DOOR_SPAWN },
  defaultSpawn: 'door',
  lighting: 'shop',
  lights: [],
  npcs: [clerk('npc-gear-clerk', 226, 104, { skin: 'tone2', hairStyle: 'locs', hairColor: 'brown', top: 'hoodie', topColor: 'black', pantsColor: 'black' })],
};

const cafe: AreaLayout = {
  width: ROOM_W,
  height: ROOM_H,
  register: registerInteriorArt,
  background: 'room-cafe',
  props: [
    { key: 'cafe-counter', x: 88, y: 46 },
    { key: 'cafe-table', x: 30, y: 98 },
    { key: 'cafe-table', x: 30, y: 140 },
    { key: 'cafe-table', x: 220, y: 98 },
    { key: 'cafe-table', x: 220, y: 140 },
  ],
  colliders: [
    ...roomWalls(),
    { x: 88, y: 54, w: 112, h: 22 },
    { x: 96, y: 34, w: 96, h: 20 }, // behind the counter
    ...[[30, 98], [30, 140], [220, 98], [220, 140]].map(([x, y]) => ({ x: x!, y: y! + 6, w: 36, h: 18 })),
  ],
  interactables: [
    roomDoor('exit', 'Go outside'),
    { id: 'cafeCounter', label: 'Order', zone: { x: 84, y: 74, w: 120, h: 20 }, tapAreas: [{ x: 88, y: 30, w: 112, h: 46 }] },
  ],
  spawns: { door: DOOR_SPAWN },
  defaultSpawn: 'door',
  lighting: 'shop',
  lights: [],
  npcs: [clerk('npc-barista', 152, 50, { skin: 'tone1', hairStyle: 'afro', hairColor: 'red', topColor: 'olive', pantsColor: 'black' })],
};

export const LAYOUTS: Record<AreaId, AreaLayout> = { apartment, eastside, midtown, grocery, gearStore, cafe };
