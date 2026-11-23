/**
 * Tiny pixel painter for code-drawn placeholder art. Every placeholder is
 * painted onto a canvas at 1:1 pixel scale, then registered as a Phaser
 * texture. Real sprite sheets replace these later without changing scenes.
 */
export interface Painter {
  ctx: CanvasRenderingContext2D;
  /** Filled rectangle. */
  r(x: number, y: number, w: number, h: number, color: string): void;
  /** Single pixel. */
  px(x: number, y: number, color: string): void;
  /** Filled rectangle with a 1px outline. */
  box(x: number, y: number, w: number, h: number, fill: string, outline: string): void;
}

export function paintCanvas(w: number, h: number, paint: (p: Painter) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.imageSmoothingEnabled = false;
  const r = (x: number, y: number, rw: number, rh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, rw, rh);
  };
  paint({
    ctx,
    r,
    px: (x, y, color) => r(x, y, 1, 1, color),
    box: (x, y, bw, bh, fill, outline) => {
      r(x, y, bw, bh, outline);
      r(x + 1, y + 1, bw - 2, bh - 2, fill);
    },
  });
  return canvas;
}
