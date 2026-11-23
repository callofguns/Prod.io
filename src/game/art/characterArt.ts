import type Phaser from 'phaser';
import { paintCanvas, type Painter } from './painter';
import { P } from './palette';
import {
  CLOTHING_COLORS, DEFAULT_LOOK_CHOICE, HAIR_COLORS, SKIN_TONES, swatch,
  type HairStyleId, type LookChoice, type TopStyleId,
} from '../../content/looks';

export const CHAR_W = 16;
export const CHAR_H = 24;
export type CharDir = 'down' | 'up' | 'side';
export const CHAR_DIRS: CharDir[] = ['down', 'up', 'side'];
export const CHAR_FRAMES = 3; // 0 = standing, 1 = left step, 2 = right step

/** Resolved colours and shapes for one character. */
interface Look {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  hairStyle: HairStyleId;
  top: TopStyleId;
  topColor: string;
  topShade: string;
  pants: string;
  shoes: string;
}

export function resolveLook(choice: LookChoice): Look {
  const skin = swatch(SKIN_TONES, choice.skin);
  const hair = swatch(HAIR_COLORS, choice.hairColor);
  const top = swatch(CLOTHING_COLORS, choice.topColor);
  const pants = swatch(CLOTHING_COLORS, choice.pantsColor);
  return {
    skin: skin.color,
    skinShade: skin.shade,
    hair: hair.color,
    hairShade: hair.shade,
    hairStyle: choice.hairStyle,
    top: choice.top,
    topColor: top.color,
    topShade: top.shade,
    pants: pants.color,
    shoes: P.shoes,
  };
}

type R = (x: number, y: number, w: number, h: number, c: string) => void;

/** Hair drawn over the head. `b` is the walk bob offset. */
function paintHair(r: R, dir: CharDir, look: Look, b: number) {
  const h = look.hair;
  const hs = look.hairShade;
  switch (look.hairStyle) {
    case 'buzz':
      if (dir === 'side') { r(5, 3 + b, 7, 1, h); r(5, 4 + b, 2, 3, hs); }
      else if (dir === 'down') r(4, 3 + b, 8, 1, h);
      else { r(4, 3 + b, 8, 6, hs); r(4, 3 + b, 8, 1, h); }
      return;
    case 'afro':
      if (dir === 'side') { r(4, 0 + b, 9, 5, h); r(3, 2 + b, 5, 6, h); r(4, 1 + b, 7, 1, hs); }
      else if (dir === 'down') { r(3, 0 + b, 10, 5, h); r(2, 2 + b, 2, 5, h); r(12, 2 + b, 2, 5, h); r(4, 1 + b, 8, 1, hs); }
      else { r(2, 0 + b, 12, 10, h); r(4, 1 + b, 8, 1, hs); }
      return;
    case 'locs':
      if (dir === 'side') {
        r(5, 2 + b, 7, 3, h);
        for (let i = 0; i < 3; i++) r(4 + i, 4 + b, 1, 9 - i, i % 2 ? hs : h);
      } else if (dir === 'down') {
        r(4, 2 + b, 8, 3, h);
        r(3, 4 + b, 1, 8, h);
        r(4, 4 + b, 1, 6, hs);
        r(11, 4 + b, 1, 6, hs);
        r(12, 4 + b, 1, 8, h);
      } else {
        r(4, 2 + b, 8, 8, h);
        for (let x = 4; x < 12; x += 2) { r(x, 10 + b, 1, 4, hs); r(x + 1, 10 + b, 1, 3, h); }
      }
      return;
    case 'cap': {
      const c = look.topColor;
      const cs = look.topShade;
      if (dir === 'side') { r(5, 2 + b, 7, 3, c); r(11, 4 + b, 3, 1, cs); r(5, 5 + b, 2, 2, look.hair); }
      else if (dir === 'down') { r(4, 2 + b, 8, 3, c); r(4, 5 + b, 8, 1, cs); }
      else { r(4, 2 + b, 8, 4, c); r(4, 6 + b, 8, 3, look.hair); r(6, 5 + b, 4, 1, cs); }
      return;
    }
    case 'short':
    default:
      if (dir === 'side') { r(5, 2 + b, 7, 3, h); r(5, 4 + b, 3, 4, h); }
      else if (dir === 'down') { r(4, 2 + b, 8, 3, h); r(4, 4 + b, 1, 3, h); r(11, 4 + b, 1, 3, h); }
      else r(4, 2 + b, 8, 8, h);
  }
}

function paintFrame(p: Painter, ox: number, dir: CharDir, frame: number, look: Look) {
  const r: R = (x, y, w, h, c) => p.r(ox + x, y, w, h, c);
  const b = frame === 0 ? 0 : 1;
  const tee = look.top === 'tee';

  if (dir === 'side') {
    const fwd = frame === 0 ? 0 : frame === 1 ? 2 : -2;
    r(6 - fwd, 18, 3, 4, look.pants);
    r(7 + fwd, 18, 3, 4, look.pants);
    r(5 - fwd, 22, 4, 2, look.shoes);
    r(7 + fwd, 22, 4, 2, look.shoes);
    r(5, 11 + b, 6, 8, look.topColor);
    r(5, 11 + b, 1, 8, look.topShade);
    if (!tee) r(4, 11 + b, 2, 4, look.topShade); // hood
    const ax = 7 + Math.sign(-fwd);
    r(ax, 13 + b, 3, tee ? 2 : 5, look.topShade);
    if (tee) r(ax, 15 + b, 3, 3, look.skin);
    r(ax, 18 + b, 3, 1, look.skin);
    r(5, 4 + b, 7, 7, look.skin);
    r(10, 6 + b, 1, 2, P.ink); // eye
    r(11, 8 + b, 1, 1, look.skinShade); // nose
    paintHair(r, dir, look, b);
    return;
  }

  const leftLift = frame === 1 ? 1 : 0;
  const rightLift = frame === 2 ? 1 : 0;
  r(5, 18 - leftLift, 3, 4, look.pants);
  r(8, 18 - rightLift, 3, 4, look.pants);
  r(4, 22 - leftLift, 4, 2, look.shoes);
  r(8, 22 - rightLift, 4, 2, look.shoes);
  r(4, 11 + b, 8, 8, look.topColor);
  r(2, 12 + b, 2, tee ? 2 : 6, look.topShade);
  r(12, 12 + b, 2, tee ? 2 : 6, look.topShade);
  if (tee) { r(2, 14 + b, 2, 4, look.skin); r(12, 14 + b, 2, 4, look.skin); }
  r(2, 18 + b, 2, 1, look.skin);
  r(12, 18 + b, 2, 1, look.skin);
  r(4, 18 + b, 8, 1, look.topShade);
  r(4, 3 + b, 8, 8, look.skin);
  if (dir === 'down') {
    r(6, 7 + b, 1, 2, P.ink);
    r(9, 7 + b, 1, 2, P.ink);
    if (tee) r(6, 11 + b, 4, 1, look.skinShade); // neckline
    else { r(7, 12 + b, 1, 3, P.white); r(9, 12 + b, 1, 3, P.white); } // hoodie strings
  } else if (!tee) {
    r(5, 11 + b, 6, 3, look.topShade); // hood on the back
  }
  paintHair(r, dir, look, b);
}

/** Paints a 9-frame sheet: down 0-2, up 3-5, side 6-8 (left is side flipped). */
export function paintCharacterSheet(choice: LookChoice): HTMLCanvasElement {
  const look = resolveLook(choice);
  return paintCanvas(CHAR_W * CHAR_DIRS.length * CHAR_FRAMES, CHAR_H, (p) => {
    CHAR_DIRS.forEach((dir, d) => {
      for (let f = 0; f < CHAR_FRAMES; f++) paintFrame(p, (d * CHAR_FRAMES + f) * CHAR_W, dir, f, look);
    });
  });
}

export function registerCharacter(scene: Phaser.Scene, key: string, choice: LookChoice = DEFAULT_LOOK_CHOICE): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.addCanvas(key, paintCharacterSheet(choice));
  if (!texture) throw new Error(`Could not create texture ${key}`);
  CHAR_DIRS.forEach((dir, d) => {
    for (let f = 0; f < CHAR_FRAMES; f++) {
      texture.add(`${dir}-${f}`, 0, (d * CHAR_FRAMES + f) * CHAR_W, 0, CHAR_W, CHAR_H);
    }
  });
}
