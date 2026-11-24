import { describe, expect, it } from 'vitest';
import { buildNavGrid, findPath, lineOfSight, nearestWalkable, isWalkable, type Rect } from '../src/game/pathfinding';

const feet = { w: 10, h: 5 };
// A 120×80 room with a wall in the middle that has a gap at the bottom.
const wall: Rect = { x: 56, y: 0, w: 8, h: 60 };
const grid = buildNavGrid(120, 80, [wall], feet);

describe('pathfinding', () => {
  it('marks cells under obstacles and outside the room as blocked', () => {
    expect(isWalkable(grid, 15, 10)).toBe(false); // inside the wall
    expect(isWalkable(grid, 0, 0)).toBe(false); // feet box would leave the room
    expect(isWalkable(grid, 5, 10)).toBe(true);
  });

  it('walks around obstacles instead of through them', () => {
    const path = findPath(grid, { x: 20, y: 20 }, { x: 100, y: 20 })!;
    expect(path).not.toBeNull();
    // Every leg of the path is walkable in a straight line.
    let from = { x: 22, y: 22 };
    for (const p of path) {
      expect(lineOfSight(grid, from, p)).toBe(true);
      from = p;
    }
    // It had to dip below the wall (wall ends at y=60; feet box is 5 tall).
    expect(Math.max(...path.map((p) => p.y))).toBeGreaterThan(60);
    expect(path.at(-1)!.x).toBeGreaterThan(95);
  });

  it('goes straight when nothing is in the way', () => {
    const path = findPath(grid, { x: 10, y: 30 }, { x: 40, y: 30 })!;
    expect(path).toHaveLength(1);
  });

  it('snaps a tap on an obstacle to the nearest walkable spot', () => {
    const cell = nearestWalkable(grid, { x: 60, y: 20 })!;
    expect(isWalkable(grid, cell.c, cell.r)).toBe(true);
    expect(findPath(grid, { x: 20, y: 20 }, { x: 60, y: 20 })).not.toBeNull();
  });

  it('returns null when the goal is sealed off', () => {
    const sealed = buildNavGrid(120, 80, [{ x: 56, y: 0, w: 8, h: 80 }], feet);
    expect(findPath(sealed, { x: 20, y: 40 }, { x: 100, y: 40 })).toBeNull();
  });
});
