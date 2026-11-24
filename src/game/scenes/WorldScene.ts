import Phaser from 'phaser';
import type { Simulation } from '../../sim/Simulation';
import type { Facing } from '../../sim/core/state';
import { toCalendar } from '../../sim/core/time';
import type { ViewBridge } from '../../app/ViewBridge';
import { registerApartmentArt } from '../art/apartmentArt';
import { registerCharacter } from '../art/characterArt';
import { CAR_KEYS } from '../art/cityArt';
import { paintCanvas } from '../art/painter';
import { darknessAt } from '../daylight';
import { settings } from '../../app/settings';
import { buildNavGrid, cellPoint, findPath, isWalkable, type NavGrid, type Point, type Rect } from '../pathfinding';
import { LAYOUTS, type AreaLayout, type Interactable } from '../areas/layouts';
import { CLOTHING_COLORS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, TOP_STYLES, type LookChoice } from '../../content/looks';
import type { AreaId } from '../../content/city';

export interface SceneDeps {
  sim: Simulation;
  bridge: ViewBridge;
}

const WALK_SPEED = 72; // world px per second
const FEET_W = 10;
const FEET_H = 5;
/** A press that moves less than this (CSS px) and lasts less than TAP_MS counts as a tap. */
const TAP_SLOP = 14;
const TAP_MS = 600;
/** Joystick dead zone. */
const STICK_DEAD = 0.2;
/** The camera shows at most this much of a big area (world px), like the apartment. */
const VIEW_W = 288;
const VIEW_H = 192;

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const contains = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const reducedMotion = () => document.documentElement.dataset.motion === 'reduce';

interface Walker {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  speed: number;
  dir: 1 | -1;
  clock: number;
}

/**
 * The walkable world. One scene class builds whichever area the simulation
 * says the player is in (apartment, a street, a shop) from its layout, and
 * restarts itself when the player moves to another area.
 */
export class WorldScene extends Phaser.Scene {
  private deps!: SceneDeps;
  private areaId: AreaId = 'apartment';
  private layout!: AreaLayout;
  private player!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Image;
  private sky: Phaser.GameObjects.Rectangle | null = null;
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
  private walkers: Walker[] = [];
  private carClock = 0;
  private leaving = false;
  private arrow!: Phaser.GameObjects.Image;
  private arrowClock = 0;

  constructor() {
    super('world');
  }

  init(deps: SceneDeps): void {
    this.deps = deps;
    this.areaId = deps.sim.city.area();
    this.layout = LAYOUTS[this.areaId];
    this.path = null;
    this.pathTarget = null;
    this.nearby = null;
    this.walkers = [];
    this.glows = [];
    this.sky = null;
    this.leaving = false;
    this.carClock = 0;
  }

  create(): void {
    const { sim, bridge } = this.deps;
    const L = this.layout;
    registerApartmentArt(this); // shared bits: glow and shadow
    L.register(this);
    registerCharacter(this, 'player', sim.state.player.look);

    this.add.image(0, 0, L.background).setOrigin(0, 0).setDepth(-3);
    if (L.lighting === 'home') {
      // The sky seen through the apartment window, then the window frame.
      this.sky = this.add.rectangle(62, 7, 32, 16, 0x9fd3f0).setOrigin(0, 0).setDepth(-2);
      this.add.image(60, 5, 'window-frame').setOrigin(0, 0).setDepth(-1);
    }
    for (const prop of L.props) {
      const img = this.add.image(prop.x, prop.y, prop.key).setOrigin(0, 0).setFlipX(!!prop.flipX);
      img.setDepth(prop.depth ?? prop.y + img.height);
    }
    for (const npc of L.npcs) {
      registerCharacter(this, npc.key, npc.look);
      this.add.image(npc.x, npc.y, 'shadow').setOrigin(0.5, 0.6).setDepth(npc.y - 0.5);
      this.add.sprite(npc.x, npc.y, npc.key, `${npc.facing === 'left' || npc.facing === 'right' ? 'side' : npc.facing}-0`).setOrigin(0.5, 1).setDepth(npc.y);
    }
    if (L.street) this.spawnWalkers(L.street.walkY);

    // The tutorial's arrow, pointing at the thing to walk to.
    if (!this.textures.exists('tut-arrow')) {
      this.textures.addCanvas('tut-arrow', paintCanvas(11, 10, (p) => {
        p.r(0, 0, 11, 4, '#1b1a22');
        p.r(1, 1, 9, 2, '#ffb347');
        for (let i = 0; i < 6; i++) p.r(i, 3 + i, 11 - i * 2, 1, i === 5 ? '#1b1a22' : '#1b1a22');
        for (let i = 0; i < 5; i++) p.r(i + 1, 3 + i, 9 - i * 2, 1, '#ffb347');
      }));
    }
    this.arrow = this.add.image(0, 0, 'tut-arrow').setOrigin(0.5, 1).setDepth(10_002).setVisible(false);

    // Night overlay and light sources.
    this.night = this.add.rectangle(0, 0, L.width, L.height, 0x141a3a).setOrigin(0, 0).setDepth(10_000).setAlpha(0);
    this.glows = L.lights.map((l) => {
      const g = this.add.image(l.x, l.y, 'glow').setScale(l.scale);
      if (l.tint) g.setTint(l.tint);
      return g.setDepth(10_001).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    });

    const loc = sim.state.player.location;
    const spawn = loc.area === this.areaId && loc.x >= 0
      ? loc
      : L.spawns[loc.spawn ?? ''] ?? L.spawns[L.defaultSpawn]!;
    this.facing = spawn.facing;
    this.shadow = this.add.image(spawn.x, spawn.y, 'shadow').setOrigin(0.5, 0.6);
    this.player = this.add.sprite(spawn.x, spawn.y, 'player', this.frameFor(0)).setOrigin(0.5, 1);
    this.player.setFlipX(this.facing === 'left');
    this.setWalking(false, 0);
    this.reportLocation();

    const kb = this.input.keyboard;
    if (!kb) throw new Error('Keyboard input is not available');
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D, e: K.E,
    }, false) as typeof this.keys;
    this.keys.e.on('down', () => {
      if (this.nearby && !sim.state.clock.paused && !sim.activity.isBusy()) bridge.onInteract(this.nearby.id);
    });

    // Tap (or click) the ground to walk there; tap things to walk over and use them.
    this.nav = buildNavGrid(L.width, L.height, L.colliders, { w: FEET_W, h: FEET_H });
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

    const offs = [
      // After sleeping in bed, get up beside it.
      sim.events.on('activityChanged', ({ woke }) => {
        if (!woke?.inBed || !L.spawns.bed) return;
        this.player.setPosition(L.spawns.bed.x, L.spawns.bed.y);
        this.facing = 'down';
        this.reportLocation();
      }),
      // Moving to another area rebuilds the scene there.
      sim.events.on('areaChanged', () => {
        if (this.leaving) return;
        this.leaving = true;
        bridge.openActions(null);
        bridge.setPrompt(null);
        this.time.delayedCall(0, () => this.scene.restart(this.deps));
      }),
      settings.subscribe(() => this.fitCamera()),
      bridge.onLayout(() => this.fitCamera()),
    ];
    this.scale.on('resize', this.fitCamera, this);
    const cleanup = () => {
      this.scale.off('resize', this.fitCamera, this);
      offs.forEach((off) => off());
    };
    this.events.once('shutdown', cleanup);
    this.events.once('destroy', cleanup);

    this.cameras.main.setBackgroundColor('#121018');
    this.fitCamera();
    this.updateLighting();
    if (!reducedMotion()) this.cameras.main.fadeIn(220, 18, 16, 24);
  }

  override update(_time: number, deltaMs: number): void {
    const { sim } = this.deps;
    sim.update(deltaMs);
    if (this.leaving) return;
    this.updateLighting();
    this.updateStreetLife(deltaMs);
    this.updateArrow(deltaMs);
    const away = sim.state.activity?.kind === 'sleeping' || sim.state.activity?.kind === 'traveling';
    this.player.setVisible(!away);
    this.shadow.setVisible(!away);
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

  private updateArrow(deltaMs: number): void {
    const id = this.deps.bridge.tutorialTarget;
    const it = id ? this.layout.interactables.find((i) => i.id === id) : undefined;
    const area = it?.tapAreas[0];
    if (!area) {
      this.arrow.setVisible(false);
      return;
    }
    this.arrowClock += deltaMs;
    const bob = reducedMotion() ? 0 : Math.round(Math.sin(this.arrowClock / 180) * 2);
    this.arrow.setVisible(true).setPosition(Math.round(area.x + area.w / 2), Math.max(12, area.y - 2 + bob));
  }

  // ---------- Street life (view only, not simulated) ----------

  private randomLook(): LookChoice {
    const any = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]!;
    return {
      skin: any(SKIN_TONES).id,
      hairStyle: any(HAIR_STYLES).id,
      hairColor: any(HAIR_COLORS).id,
      top: any(TOP_STYLES).id,
      topColor: any(CLOTHING_COLORS).id,
      pantsColor: any(CLOTHING_COLORS).id,
    };
  }

  private spawnWalkers(walkY: [number, number]): void {
    const count = this.areaId === 'midtown' ? 4 : 3;
    for (let i = 0; i < count; i++) {
      const key = `npc-walker-${i}`;
      registerCharacter(this, key, this.randomLook());
      const y = walkY[0] + Math.random() * (walkY[1] - walkY[0]);
      const x = 20 + Math.random() * (this.layout.width - 40);
      const shadow = this.add.image(x, y, 'shadow').setOrigin(0.5, 0.6).setDepth(y - 0.5);
      const sprite = this.add.sprite(x, y, key, 'side-0').setOrigin(0.5, 1).setDepth(y);
      const dir = Math.random() < 0.5 ? 1 : -1;
      sprite.setFlipX(dir < 0);
      this.walkers.push({ sprite, shadow, speed: 22 + Math.random() * 16, dir, clock: Math.random() * 1000 });
    }
  }

  private updateStreetLife(deltaMs: number): void {
    const street = this.layout.street;
    if (!street) return;
    const { paused } = this.deps.sim.state.clock;
    if (paused) return;
    const W = this.layout.width;
    for (const w of this.walkers) {
      w.clock += deltaMs;
      let x = w.sprite.x + (w.dir * w.speed * deltaMs) / 1000;
      if (x < -12 || x > W + 12) {
        // Walk off one end, come back on the other a little later at a new height.
        w.dir = Math.random() < 0.5 ? 1 : -1;
        x = w.dir > 0 ? -10 : W + 10;
        const y = street.walkY[0] + Math.random() * (street.walkY[1] - street.walkY[0]);
        w.sprite.setY(y).setDepth(y);
        w.shadow.setY(y).setDepth(y - 0.5);
        w.sprite.setFlipX(w.dir < 0);
      }
      w.sprite.setX(x);
      w.shadow.setX(x);
      w.sprite.setFrame(`side-${1 + (Math.floor(w.clock / 200) % 2)}`);
    }
    this.carClock -= deltaMs;
    if (this.carClock <= 0) {
      this.carClock = 1800 + Math.random() * 3500;
      this.spawnCar(street.lanes);
    }
  }

  private spawnCar(lanes: number[]): void {
    const lane = Math.floor(Math.random() * lanes.length);
    const right = lane === 0;
    const y = lanes[lane]!;
    const key = CAR_KEYS[Math.floor(Math.random() * CAR_KEYS.length)]!;
    const W = this.layout.width;
    const car = this.add.image(right ? -44 : W + 44, y, key).setOrigin(0.5, 1).setFlipX(!right).setDepth(y + 2);
    const speed = 70 + Math.random() * 50;
    this.tweens.add({
      targets: car,
      x: right ? W + 44 : -44,
      duration: ((W + 88) / speed) * 1000,
      onComplete: () => car.destroy(),
    });
  }

  // ---------- Player movement ----------

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
    const target = this.layout.interactables.find((it) => it.tapAreas.some((r) => contains(r, world.x, world.y))) ?? null;
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
    if (reducedMotion()) {
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
    if (this.layout.colliders.some((c) => overlaps(feet, c))) return;
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
    for (const it of this.layout.interactables) {
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
      area: this.areaId, x: Math.round(x), y: Math.round(y), facing: this.facing,
    });
  }

  private updateLighting(): void {
    const t = toCalendar(this.deps.sim.state.clock.totalMinutes);
    const dark = darknessAt(t.hour + t.minute / 60);
    const L = this.layout;
    const shade = L.lighting === 'home' ? 0.68 : L.lighting === 'street' ? 0.6 : 0.12;
    this.night.setAlpha(dark * shade);
    this.glows.forEach((g) => g.setAlpha(dark * 0.9));
    if (this.sky) {
      const day = Phaser.Display.Color.ValueToColor(0x9fd3f0);
      const night = Phaser.Display.Color.ValueToColor(0x1c2350);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(day, night, 100, dark * 100);
      this.sky.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
    }
  }

  /**
   * The world renders in the space the HUD leaves free. The canvas is in
   * device pixels, so the zoom is a whole number of device pixels per world
   * pixel: crisp on any screen. Small areas are centred; big ones (streets)
   * show about a room's worth and follow the player.
   */
  private fitCamera(): void {
    if (!this.player) return;
    const L = this.layout;
    const dpr = 1 / this.scale.zoom; // the game is displayed at 1/dpr
    const { width, height } = this.scale;
    const top = Math.round(this.deps.bridge.hudInsets.top * dpr);
    const bottom = Math.round(this.deps.bridge.hudInsets.bottom * dpr);
    const viewH = Math.max(120 * dpr, height - top - bottom);
    const cam = this.cameras.main;
    cam.setViewport(0, top, width, viewH);
    const margin = 8 * dpr;
    const fit = Math.floor(Math.min((width - margin * 2) / Math.min(L.width, VIEW_W), (viewH - margin) / Math.min(L.height, VIEW_H)));
    const chosen = settings.get().zoom; // in CSS pixels per world pixel
    // Never smaller than 1 CSS pixel per world pixel; follow the player if that overflows.
    const zoom = Math.max(Math.ceil(dpr), chosen === 'auto' ? fit : Math.round(chosen * dpr));
    cam.setZoom(zoom);
    cam.setRoundPixels(true);
    const viewW = width / zoom;
    const viewHw = viewH / zoom;
    if (L.width <= viewW && L.height <= viewHw) {
      cam.stopFollow();
      cam.removeBounds();
      cam.centerOn(L.width / 2, L.height / 2);
    } else {
      // Bounds at least as big as the view keep a narrow area centred instead of pinned left.
      const bw = Math.max(L.width, viewW);
      const bh = Math.max(L.height, viewHw);
      cam.setBounds(L.width / 2 - bw / 2, L.height / 2 - bh / 2, bw, bh);
      cam.startFollow(this.player, true, 0.2, 0.2);
      cam.centerOn(this.player.x, this.player.y);
    }
  }
}
