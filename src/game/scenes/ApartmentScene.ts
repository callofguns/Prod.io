import Phaser from 'phaser';
import type { Simulation } from '../../sim/Simulation';
import type { Facing } from '../../sim/core/state';
import { toCalendar } from '../../sim/core/time';
import type { ViewBridge } from '../../app/ViewBridge';
import { registerApartmentArt, ROOM_H, ROOM_W, TILE, DOOR_X, DOOR_W } from '../art/apartmentArt';
import { registerCharacter } from '../art/characterArt';
import { darknessAt } from '../daylight';
import { settings } from '../../app/settings';
import { buildNavGrid, cellPoint, findPath, isWalkable, type NavGrid, type Point, type Rect } from '../pathfinding';

interface Interactable {
  id: string;
  label: string;
  /** Where the player's feet must be to use it. */
  zone: Rect;
  /** What you can tap on screen to walk over and use it (sprite bounds). */
  tapAreas: Rect[];
}

export interface SceneDeps {
  sim: Simulation;
  bridge: ViewBridge;
}

const AREA = 'apartment';
const WALK_SPEED = 72; // world px per second
const FEET_W = 10;
const FEET_H = 5;
const START = { x: 152, y: 124 };
/** Where the player stands after getting out of bed. */
const BED_SIDE = { x: 34, y: 96 };
const BOTTOM = ROOM_H - TILE;
/** A press that moves less than this (CSS px) and lasts less than TAP_MS counts as a tap. */
const TAP_SLOP = 14;
const TAP_MS = 600;
/** Joystick dead zone. */
const STICK_DEAD = 0.2;

/** Solid parts of the room, in world pixels. Furniture uses its footprint, not its full sprite. */
const COLLIDERS: Rect[] = [
  { x: 0, y: 0, w: ROOM_W, h: 2 * TILE + 2 }, // back wall
  { x: 0, y: 0, w: TILE, h: ROOM_H }, // left wall
  { x: ROOM_W - TILE, y: 0, w: TILE, h: ROOM_H }, // right wall
  { x: 0, y: BOTTOM, w: DOOR_X, h: TILE }, // bottom wall, left of door
  { x: DOOR_X + DOOR_W, y: BOTTOM, w: ROOM_W - DOOR_X - DOOR_W, h: TILE }, // right of door
  { x: DOOR_X, y: ROOM_H - 4, w: DOOR_W, h: 4 }, // closed door
  { x: 16, y: 34, w: 32, h: 44 }, // bed
  { x: 50, y: 40, w: 16, h: 10 }, // nightstand
  { x: 112, y: 38, w: 64, h: 16 }, // desk
  { x: 208, y: 34, w: 48, h: 20 }, // counter
  { x: 256, y: 34, w: 16, h: 20 }, // fridge
  { x: 138, y: 64, w: 12, h: 8 }, // desk chair
  { x: 24, y: 146, w: 48, h: 18 }, // couch
  { x: 254, y: 160, w: 10, h: 6 }, // plant
];

const grow = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 });

const INTERACTABLES: Interactable[] = [
  { id: 'bed', label: 'Sleep', zone: grow({ x: 16, y: 34, w: 32, h: 44 }, 10), tapAreas: [{ x: 16, y: 30, w: 32, h: 48 }] },
  {
    id: 'computer', label: 'Use computer', zone: grow({ x: 112, y: 38, w: 64, h: 16 }, 12),
    tapAreas: [{ x: 112, y: 16, w: 64, h: 40 }, { x: 136, y: 52, w: 16, h: 20 }],
  },
  { id: 'stove', label: 'Cook', zone: grow({ x: 208, y: 34, w: 40, h: 20 }, 10), tapAreas: [{ x: 208, y: 20, w: 48, h: 34 }] },
  { id: 'fridge', label: 'Open fridge', zone: grow({ x: 256, y: 34, w: 16, h: 20 }, 10), tapAreas: [{ x: 256, y: 8, w: 16, h: 46 }] },
  {
    id: 'door', label: 'Leave apartment', zone: { x: DOOR_X - 4, y: BOTTOM - 14, w: DOOR_W + 8, h: 20 },
    tapAreas: [{ x: DOOR_X, y: BOTTOM - 10, w: DOOR_W, h: TILE + 10 }],
  },
];

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const contains = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export class ApartmentScene extends Phaser.Scene {
  private deps!: SceneDeps;
  private player!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Image;
  private sky!: Phaser.GameObjects.Rectangle;
  private night!: Phaser.GameObjects.Rectangle;
  private glows: Phaser.GameObjects.Image[] = [];
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'e', Phaser.Input.Keyboard.Key>;
  private facing: Facing = 'down';
  private walkClock = 0;
  private reportClock = 0;
  private nearby: Interactable | null = null;
  private nav!: NavGrid;
  /** Remaining waypoints of a tap-to-move walk, and what to use on arrival. */
  private path: Point[] | null = null;
  private pathTarget: Interactable | null = null;
  private pressAt: { x: number; y: number; t: number } | null = null;

  constructor() {
    super('apartment');
  }

  init(deps: SceneDeps): void {
    this.deps = deps;
  }

  create(): void {
    registerApartmentArt(this);
    registerCharacter(this, 'player', this.deps.sim.state.player.look);

    // Room, then the sky seen through the window, then the window frame.
    this.add.image(0, 0, 'room-bg').setOrigin(0, 0).setDepth(-3);
    this.sky = this.add.rectangle(62, 7, 32, 16, 0x9fd3f0).setOrigin(0, 0).setDepth(-2);
    this.add.image(60, 5, 'window-frame').setOrigin(0, 0).setDepth(-1);

    const prop = (key: string, x: number, y: number) => {
      const img = this.add.image(x, y, key).setOrigin(0, 0);
      img.setDepth(y + img.height);
      return img;
    };
    prop('bed', 16, 30);
    prop('nightstand', 50, 22);
    prop('desk', 112, 16);
    prop('chair', 136, 52).setDepth(62);
    prop('counter', 208, 20);
    prop('fridge', 256, 8);
    prop('couch', 24, 140);
    prop('plant', 252, 142);

    // Night overlay and light sources (lamp and monitor).
    this.night = this.add.rectangle(0, 0, ROOM_W, ROOM_H, 0x141a3a).setOrigin(0, 0).setDepth(10_000).setAlpha(0);
    this.glows = [
      this.add.image(58, 28, 'glow').setScale(1.4),
      this.add.image(144, 26, 'glow').setScale(1.1).setTint(0x88e0ff),
    ];
    this.glows.forEach((g) => g.setDepth(10_001).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0));

    const loc = this.deps.sim.state.player.location;
    const start = loc.area === AREA && loc.x >= 0 ? loc : { ...START, facing: 'down' as Facing };
    this.facing = start.facing;
    this.shadow = this.add.image(start.x, start.y, 'shadow').setOrigin(0.5, 0.6);
    this.player = this.add.sprite(start.x, start.y, 'player', this.frameFor(0)).setOrigin(0.5, 1);
    this.player.setFlipX(this.facing === 'left');

    const kb = this.input.keyboard;
    if (!kb) throw new Error('Keyboard input is not available');
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D, e: K.E,
    }, false) as typeof this.keys;
    this.keys.e.on('down', () => {
      const { sim } = this.deps;
      if (this.nearby && !sim.state.clock.paused && !sim.activity.isBusy()) this.deps.bridge.onInteract(this.nearby.id);
    });

    // Tap (or click) the floor to walk there; tap furniture to walk over and use it.
    this.nav = buildNavGrid(ROOM_W, ROOM_H, COLLIDERS, { w: FEET_W, h: FEET_H });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pressAt = { x: p.x, y: p.y, t: p.downTime };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const press = this.pressAt;
      this.pressAt = null;
      const slop = TAP_SLOP / this.scale.zoom; // pointer coordinates are in device pixels
      if (!press || Math.hypot(p.x - press.x, p.y - press.y) > slop || p.upTime - press.t > TAP_MS) return;
      this.handleTap(p.x, p.y);
    });
    // After sleeping in bed, get up beside it.
    const offWake = this.deps.sim.events.on('activityChanged', ({ woke }) => {
      if (!woke?.inBed) return;
      this.player.setPosition(BED_SIDE.x, BED_SIDE.y);
      this.facing = 'down';
      this.reportLocation();
    });
    this.events.once('shutdown', offWake);
    this.events.once('destroy', offWake);

    this.cameras.main.setBackgroundColor('#121018');
    this.scale.on('resize', this.fitCamera, this);
    this.fitCamera();
    this.updateLighting();
    const offSettings = settings.subscribe(() => this.fitCamera());
    const offLayout = this.deps.bridge.onLayout(() => this.fitCamera());
    const cleanup = () => {
      this.scale.off('resize', this.fitCamera, this);
      offSettings();
      offLayout();
    };
    this.events.once('shutdown', cleanup);
    this.events.once('destroy', cleanup);
  }

  override update(_time: number, deltaMs: number): void {
    const { sim } = this.deps;
    sim.update(deltaMs);
    this.updateLighting();
    const asleep = sim.state.activity?.kind === 'sleeping';
    this.player.setVisible(!asleep);
    this.shadow.setVisible(!asleep);
    if (sim.state.clock.paused || sim.activity.isBusy()) {
      this.setWalking(false, deltaMs);
      if (sim.activity.isBusy()) {
        this.deps.bridge.setPrompt(null);
        this.path = null;
      }
      return;
    }
    this.move(deltaMs);
    this.updatePrompt();
    this.reportClock += deltaMs;
    if (this.reportClock > 400) {
      this.reportClock = 0;
      this.reportLocation();
    }
  }

  private move(deltaMs: number): void {
    const k = this.keys;
    let dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    let dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    let speed = 1;
    const stick = this.deps.bridge.joystick;
    const tilt = Math.hypot(stick.x, stick.y);
    if (dx === 0 && dy === 0 && tilt > STICK_DEAD) {
      dx = stick.x;
      dy = stick.y;
      speed = Math.min(1, 0.4 + tilt * 0.6);
    }
    const manual = dx !== 0 || dy !== 0;
    if (manual) {
      this.path = null; // steering by hand cancels a tap-to-move walk
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.face(dx, dy);
      const step = (WALK_SPEED * speed * deltaMs) / 1000;
      this.tryMove(dx * step, 0);
      this.tryMove(0, dy * step);
      this.setWalking(true, deltaMs);
      return;
    }
    this.setWalking(this.followPath(deltaMs), deltaMs);
  }

  private face(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
    else this.facing = dy > 0 ? 'down' : 'up';
  }

  /** Walks along the tap-to-move path. Returns whether the player moved. */
  private followPath(deltaMs: number): boolean {
    if (!this.path) return false;
    let budget = (WALK_SPEED * deltaMs) / 1000;
    while (budget > 0 && this.path.length > 0) {
      const next = this.path[0]!;
      const dx = next.x - this.player.x;
      const dy = next.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= budget) {
        this.player.setPosition(next.x, next.y);
        this.path.shift();
        budget -= dist;
      } else {
        this.face(dx, dy);
        this.player.setPosition(this.player.x + (dx / dist) * budget, this.player.y + (dy / dist) * budget);
        budget = 0;
      }
    }
    if (this.path.length === 0) {
      this.path = null;
      const target = this.pathTarget;
      this.pathTarget = null;
      if (target && contains(target.zone, this.player.x, this.player.y)) {
        this.updatePrompt();
        this.deps.bridge.openActions(target.id);
      }
    }
    return true;
  }

  private handleTap(screenX: number, screenY: number): void {
    const { sim, bridge } = this.deps;
    if (sim.state.clock.paused || sim.activity.isBusy()) return;
    const world = this.cameras.main.getWorldPoint(screenX, screenY);
    const target = INTERACTABLES.find((it) => it.tapAreas.some((r) => contains(r, world.x, world.y))) ?? null;
    const here = { x: this.player.x, y: this.player.y };
    if (target && contains(target.zone, here.x, here.y)) {
      this.path = null;
      bridge.openActions(target.id);
      return;
    }
    const goal = target ? this.closestCellIn(target.zone) : world;
    if (!goal) return;
    const path = findPath(this.nav, here, goal);
    if (!path || path.length === 0) return;
    bridge.openActions(null);
    this.path = path;
    this.pathTarget = target;
    this.showTapMarker(path[path.length - 1]!);
  }

  /** The walkable spot inside a zone nearest the player. */
  private closestCellIn(zone: Rect): Point | null {
    let best: Point | null = null;
    let bestDist = Infinity;
    for (let r = 0; r < this.nav.rows; r++) {
      for (let c = 0; c < this.nav.cols; c++) {
        if (!isWalkable(this.nav, c, r)) continue;
        const p = cellPoint(this.nav, c, r);
        if (!contains(zone, p.x, p.y)) continue;
        const d = (p.x - this.player.x) ** 2 + (p.y - this.player.y) ** 2;
        if (d < bestDist) {
          bestDist = d;
          best = p;
        }
      }
    }
    return best;
  }

  private showTapMarker(at: Point): void {
    const ring = this.add.circle(at.x, at.y - 1, 4).setStrokeStyle(1, 0xffb347, 0.9).setDepth(9_999);
    if (document.documentElement.dataset.motion === 'reduce') {
      this.time.delayedCall(350, () => ring.destroy());
      return;
    }
    this.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
  }

  /** Moves the player's feet box along one axis, stopping at the first collider. */
  private tryMove(dx: number, dy: number): void {
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    const feet = { x: nx - FEET_W / 2, y: ny - FEET_H, w: FEET_W, h: FEET_H };
    if (COLLIDERS.some((c) => overlaps(feet, c))) return;
    this.player.setPosition(nx, ny);
  }

  private setWalking(walking: boolean, deltaMs: number): void {
    this.walkClock = walking ? this.walkClock + deltaMs : 0;
    const frame = walking ? 1 + (Math.floor(this.walkClock / 160) % 2) : 0;
    this.player.setFrame(this.frameFor(frame));
    this.player.setFlipX(this.facing === 'left');
    this.player.setDepth(this.player.y);
    this.shadow.setPosition(this.player.x, this.player.y).setDepth(this.player.y - 0.5);
  }

  private frameFor(frame: number): string {
    const dir = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    return `${dir}-${frame}`;
  }

  private updatePrompt(): void {
    const { x, y } = this.player;
    let best: Interactable | null = null;
    let bestDist = Infinity;
    for (const it of INTERACTABLES) {
      if (!contains(it.zone, x, y)) continue;
      const cx = it.zone.x + it.zone.w / 2;
      const cy = it.zone.y + it.zone.h / 2;
      const dist = Math.hypot(cx - x, cy - y);
      if (dist < bestDist) {
        best = it;
        bestDist = dist;
      }
    }
    this.nearby = best;
    this.deps.bridge.setPrompt(best ? { id: best.id, label: best.label } : null);
  }

  private reportLocation(): void {
    const { x, y } = this.player;
    this.deps.sim.dispatch('setPlayerLocation', {
      area: AREA, x: Math.round(x), y: Math.round(y), facing: this.facing,
    });
  }

  private updateLighting(): void {
    const t = toCalendar(this.deps.sim.state.clock.totalMinutes);
    const dark = darknessAt(t.hour + t.minute / 60);
    this.night.setAlpha(dark * 0.68);
    this.glows.forEach((g) => g.setAlpha(dark * 0.9));
    const day = Phaser.Display.Color.ValueToColor(0x9fd3f0);
    const night = Phaser.Display.Color.ValueToColor(0x1c2350);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(day, night, 100, dark * 100);
    this.sky.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
  }

  /**
   * The world renders in the space the HUD leaves free. The canvas is in
   * device pixels, so the zoom is a whole number of device pixels per world
   * pixel: crisp on any screen. When the room fits it's centred; otherwise
   * (a tiny window, or a big manual zoom) the camera follows the player.
   */
  private fitCamera(): void {
    if (!this.player) return;
    const dpr = 1 / this.scale.zoom; // the game is displayed at 1/dpr
    const { width, height } = this.scale;
    const top = Math.round(this.deps.bridge.hudInsets.top * dpr);
    const bottom = Math.round(this.deps.bridge.hudInsets.bottom * dpr);
    const viewH = Math.max(120 * dpr, height - top - bottom);
    const cam = this.cameras.main;
    cam.setViewport(0, top, width, viewH);
    const margin = 8 * dpr;
    const fit = Math.floor(Math.min((width - margin * 2) / ROOM_W, (viewH - margin) / ROOM_H));
    const chosen = settings.get().zoom; // in CSS pixels per world pixel
    // Never smaller than 1 CSS pixel per world pixel; follow the player if that overflows.
    const zoom = Math.max(Math.ceil(dpr), chosen === 'auto' ? fit : Math.round(chosen * dpr));
    cam.setZoom(zoom);
    cam.setRoundPixels(true);
    const viewW = width / zoom;
    const viewHw = viewH / zoom;
    if (ROOM_W <= viewW && ROOM_H <= viewHw) {
      cam.stopFollow();
      cam.removeBounds();
      cam.centerOn(ROOM_W / 2, ROOM_H / 2);
    } else {
      // Bounds at least as big as the view keep a narrow room centred instead of pinned left.
      const bw = Math.max(ROOM_W, viewW);
      const bh = Math.max(ROOM_H, viewHw);
      cam.setBounds(ROOM_W / 2 - bw / 2, ROOM_H / 2 - bh / 2, bw, bh);
      cam.startFollow(this.player, true, 0.2, 0.2);
    }
  }
}
