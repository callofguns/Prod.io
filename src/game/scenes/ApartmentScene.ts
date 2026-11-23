import Phaser from 'phaser';
import type { Simulation } from '../../sim/Simulation';
import type { Facing } from '../../sim/core/state';
import { toCalendar } from '../../sim/core/time';
import type { ViewBridge } from '../../app/ViewBridge';
import { registerApartmentArt, ROOM_H, ROOM_W, TILE, DOOR_X, DOOR_W } from '../art/apartmentArt';
import { registerCharacter } from '../art/characterArt';
import { darknessAt } from '../daylight';
import { settings } from '../../app/settings';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Interactable {
  id: string;
  label: string;
  zone: Rect;
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
/** Screen space reserved for the transport bar and the control hints, in CSS px. */
const HUD_TOP = 104;
const HUD_BOTTOM = 40;

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
  { id: 'bed', label: 'Sleep', zone: grow({ x: 16, y: 34, w: 32, h: 44 }, 10) },
  { id: 'computer', label: 'Use computer', zone: grow({ x: 112, y: 38, w: 64, h: 16 }, 12) },
  { id: 'stove', label: 'Cook', zone: grow({ x: 208, y: 34, w: 40, h: 20 }, 10) },
  { id: 'fridge', label: 'Open fridge', zone: grow({ x: 256, y: 34, w: 16, h: 20 }, 10) },
  { id: 'door', label: 'Leave apartment', zone: { x: DOOR_X - 4, y: BOTTOM - 14, w: DOOR_W + 8, h: 20 } },
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
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.fitCamera, this);
      offSettings();
    });
    this.events.once('destroy', offSettings);
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
      if (asleep) this.deps.bridge.setPrompt(null);
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
    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
      else this.facing = dy > 0 ? 'down' : 'up';
      const step = (WALK_SPEED * deltaMs) / 1000;
      this.tryMove(dx * step, 0);
      this.tryMove(0, dy * step);
    }
    this.setWalking(moving, deltaMs);
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
   * Integer zoom keeps pixels crisp. The room sits between the HUD (top) and
   * the control hints (bottom), centred in whatever space is left.
   */
  private fitCamera(): void {
    const { width, height } = this.scale;
    const available = height - HUD_TOP - HUD_BOTTOM;
    const fit = Math.max(1, Math.floor(Math.min((width - 32) / ROOM_W, available / ROOM_H)));
    const chosen = settings.get().zoom;
    const zoom = chosen === 'auto' ? fit : chosen;
    const top = HUD_TOP + Math.max(0, (available - ROOM_H * zoom) / 2);
    const cam = this.cameras.main;
    cam.setZoom(zoom);
    // Screen y of world y=0 should be `top`: worldCenterY = (height / 2 - top) / zoom.
    cam.centerOn(ROOM_W / 2, (height / 2 - top) / zoom);
    cam.setRoundPixels(true);
  }
}
