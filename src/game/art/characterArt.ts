import type Phaser from 'phaser';
import { paintCanvas, type Painter } from './painter';
import { P } from './palette';

export const CHAR_W = 16;
export const CHAR_H = 24;
export type CharDir = 'down' | 'up' | 'side';
const DIRS: CharDir[] = ['down', 'up', 'side'];
const FRAMES = 3; // 0 = standing, 1 = left step, 2 = right step

/** Appearance parts; character creation (Milestone 1) will supply these. */
export interface Look {
  skin: string;
  skinShade: string;
  hair: string;
  top: string;
  topShade: string;
  pants: string;
  shoes: string;
}

export const DEFAULT_LOOK: Look = {
  skin: P.skin,
  skinShade: P.skinShade,
  hair: P.hair,
  top: P.hoodie,
  topShade: P.hoodieShade,
  pants: P.pants,
  shoes: P.shoes,
};

function paintFrame(p: Painter, ox: number, dir: CharDir, frame: number, look: Look) {
  const r = (x: number, y: number, w: number, h: number, c: string) => p.r(ox + x, y, w, h, c);
  const bob = frame === 0 ? 0 : 1;
  const leftLift = frame === 1 ? 1 : 0;
  const rightLift = frame === 2 ? 1 : 0;

  if (dir === 'side') {
    // Legs: one forward, one back while walking.
    const fwd = frame === 0 ? 0 : frame === 1 ? 2 : -2;
    r(6 - fwd, 18, 3, 4, look.pants);
    r(7 + fwd, 18, 3, 4, look.pants);
    r(5 - fwd, 22, 4, 2, look.shoes);
    r(7 + fwd, 22, 4, 2, look.shoes);
    // Body
    r(5, 11 + bob, 6, 8, look.top);
    r(5, 11 + bob, 1, 8, look.topShade);
    r(4, 11 + bob, 2, 4, look.topShade); // hood
    // Arm swings opposite the front leg
    r(7 + Math.sign(-fwd), 13 + bob, 3, 5, look.topShade);
    r(7 + Math.sign(-fwd), 18 + bob, 3, 1, look.skin);
    // Head
    r(5, 4 + bob, 7, 7, look.skin);
    r(5, 2 + bob, 7, 3, look.hair);
    r(5, 4 + bob, 3, 4, look.hair);
    r(10, 6 + bob, 1, 2, P.ink); // eye
    r(11, 8 + bob, 1, 1, look.skinShade); // nose
    return;
  }

  // Legs
  r(5, 18 - leftLift, 3, 4, look.pants);
  r(8, 18 - rightLift, 3, 4, look.pants);
  r(4, 22 - leftLift, 4, 2, look.shoes);
  r(8, 22 - rightLift, 4, 2, look.shoes);
  // Body and arms
  r(4, 11 + bob, 8, 8, look.top);
  r(2, 12 + bob, 2, 6, look.topShade);
  r(12, 12 + bob, 2, 6, look.topShade);
  r(2, 18 + bob, 2, 1, look.skin);
  r(12, 18 + bob, 2, 1, look.skin);
  r(4, 18 + bob, 8, 1, look.topShade);
  // Head
  r(4, 3 + bob, 8, 8, look.skin);
  r(4, 2 + bob, 8, 3, look.hair);
  if (dir === 'down') {
    r(4, 4 + bob, 1, 3, look.hair);
    r(11, 4 + bob, 1, 3, look.hair);
    r(6, 7 + bob, 1, 2, P.ink);
    r(9, 7 + bob, 1, 2, P.ink);
    r(7, 12 + bob, 1, 3, P.white); // hoodie strings
    r(9, 12 + bob, 1, 3, P.white);
  } else {
    r(4, 3 + bob, 8, 7, look.hair);
    r(5, 11 + bob, 6, 3, look.topShade); // hood on the back
  }
}

/** Builds a 9-frame sheet: down 0-2, up 3-5, side 6-8 (left uses flipX). */
export function registerCharacter(scene: Phaser.Scene, key: string, look: Look = DEFAULT_LOOK): void {
  if (scene.textures.exists(key)) return;
  const canvas = paintCanvas(CHAR_W * DIRS.length * FRAMES, CHAR_H, (p) => {
    DIRS.forEach((dir, d) => {
      for (let f = 0; f < FRAMES; f++) paintFrame(p, (d * FRAMES + f) * CHAR_W, dir, f, look);
    });
  });
  const texture = scene.textures.addCanvas(key, canvas);
  if (!texture) throw new Error(`Could not create texture ${key}`);
  DIRS.forEach((dir, d) => {
    for (let f = 0; f < FRAMES; f++) texture.add(`${dir}-${f}`, 0, (d * FRAMES + f) * CHAR_W, 0, CHAR_W, CHAR_H);
  });
}
