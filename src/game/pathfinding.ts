/**
 * Grid pathfinding for tap-to-move. The world is sampled on a fine grid;
 * a cell is walkable when the player's feet box, centred on it, overlaps no
 * collider. A* (8 directions, no corner cutting) finds a route, then
 * line-of-sight smoothing removes the staircase. No Phaser here, so it's
 * unit-tested directly.
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface NavGrid {
  cell: number;
  cols: number;
  rows: number;
  walkable: Uint8Array;
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Feet anchor (bottom centre of the sprite) for a cell. */
export const cellPoint = (g: NavGrid, c: number, r: number): Point => ({ x: c * g.cell + g.cell / 2, y: r * g.cell + g.cell / 2 });

export function buildNavGrid(width: number, height: number, colliders: Rect[], feet: { w: number; h: number }, cell = 4): NavGrid {
  const cols = Math.floor(width / cell);
  const rows = Math.floor(height / cell);
  const walkable = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cell + cell / 2;
      const y = r * cell + cell / 2;
      const box = { x: x - feet.w / 2, y: y - feet.h, w: feet.w, h: feet.h };
      const inside = box.x >= 0 && box.y >= 0 && box.x + box.w <= width && box.y + box.h <= height;
      walkable[r * cols + c] = inside && !colliders.some((col) => overlaps(box, col)) ? 1 : 0;
    }
  }
  return { cell, cols, rows, walkable };
}

export const isWalkable = (g: NavGrid, c: number, r: number) =>
  c >= 0 && r >= 0 && c < g.cols && r < g.rows && g.walkable[r * g.cols + c] === 1;

const toCell = (g: NavGrid, p: Point) => ({
  c: Math.max(0, Math.min(g.cols - 1, Math.floor(p.x / g.cell))),
  r: Math.max(0, Math.min(g.rows - 1, Math.floor(p.y / g.cell))),
});

/** The walkable cell closest to a point (searching outward ring by ring), or null if none. */
export function nearestWalkable(g: NavGrid, p: Point, maxRadius = 40): { c: number; r: number } | null {
  const start = toCell(g, p);
  if (isWalkable(g, start.c, start.r)) return start;
  let best: { c: number; r: number } | null = null;
  let bestDist = Infinity;
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
        const c = start.c + dc;
        const r = start.r + dr;
        if (!isWalkable(g, c, r)) continue;
        const q = cellPoint(g, c, r);
        const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
        if (d < bestDist) {
          bestDist = d;
          best = { c, r };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

/** True if a straight walk between two points stays on walkable cells. */
export function lineOfSight(g: NavGrid, a: Point, b: Point): boolean {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(dist / (g.cell / 2)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const { c, r } = toCell(g, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    if (!isWalkable(g, c, r)) return false;
  }
  return true;
}

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
] as const;

/**
 * Waypoints from `from` to `to` (both snapped to walkable cells), excluding the
 * start, or null if unreachable. The last waypoint is the snapped goal.
 */
export function findPath(g: NavGrid, from: Point, to: Point): Point[] | null {
  const start = nearestWalkable(g, from);
  const goal = nearestWalkable(g, to);
  if (!start || !goal) return null;
  const key = (c: number, r: number) => r * g.cols + c;
  const goalKey = key(goal.c, goal.r);
  const startKey = key(start.c, start.r);
  const gScore = new Float64Array(g.cols * g.rows).fill(Infinity);
  const came = new Int32Array(g.cols * g.rows).fill(-1);
  const closed = new Uint8Array(g.cols * g.rows);
  const h = (c: number, r: number) => {
    const dx = Math.abs(c - goal.c);
    const dy = Math.abs(r - goal.r);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  // A small binary heap of [f, key].
  const heap: [number, number][] = [];
  const push = (f: number, k: number) => {
    heap.push([f, k]);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p]![0] <= heap[i]![0]) break;
      [heap[p], heap[i]] = [heap[i]!, heap[p]!];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l;
        if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i]!, heap[m]!];
        i = m;
      }
    }
    return top;
  };

  gScore[startKey] = 0;
  push(h(start.c, start.r), startKey);
  while (heap.length) {
    const [, k] = pop();
    if (closed[k]) continue;
    if (k === goalKey) break;
    closed[k] = 1;
    const c = k % g.cols;
    const r = (k - c) / g.cols;
    for (const [dc, dr, cost] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (!isWalkable(g, nc, nr)) continue;
      // No cutting corners past an obstacle.
      if (dc !== 0 && dr !== 0 && (!isWalkable(g, c + dc, r) || !isWalkable(g, c, r + dr))) continue;
      const nk = key(nc, nr);
      const tentative = gScore[k]! + cost;
      if (tentative < gScore[nk]!) {
        gScore[nk] = tentative;
        came[nk] = k;
        push(tentative + h(nc, nr), nk);
      }
    }
  }
  if (goalKey !== startKey && came[goalKey] === -1) return null;

  const cells: Point[] = [];
  for (let k = goalKey; k !== -1 && k !== startKey; k = came[k]!) {
    const c = k % g.cols;
    cells.push(cellPoint(g, c, (k - c) / g.cols));
  }
  cells.reverse();

  // Line-of-sight smoothing: keep only the corners we actually need.
  const smoothed: Point[] = [];
  let anchor = cellPoint(g, start.c, start.r);
  for (let i = 0; i < cells.length; i++) {
    const next = cells[i + 1];
    if (!next || !lineOfSight(g, anchor, next)) {
      smoothed.push(cells[i]!);
      anchor = cells[i]!;
    }
  }
  return smoothed;
}
