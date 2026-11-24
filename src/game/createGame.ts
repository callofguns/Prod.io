import Phaser from 'phaser';
import { WorldScene, type SceneDeps } from './scenes/WorldScene';

/** Device pixels per CSS pixel, capped so huge displays don't render needlessly large canvases. */
const pixelRatio = () => Math.min(3, Math.max(1, window.devicePixelRatio || 1));

/**
 * Boots Phaser into the given element and starts wherever the player is.
 *
 * The canvas renders at the screen's real pixel density and is displayed at
 * CSS size. Scenes then scale the pixel art by a whole number of *device*
 * pixels, which stays crisp and even on retina phones (where a whole number
 * of CSS pixels would either hide part of the room or look lumpy).
 */
export function createGame(parent: HTMLElement, deps: SceneDeps): Phaser.Game {
  const dpr = pixelRatio();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#121018',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.NONE,
      width: Math.round(parent.clientWidth * dpr),
      height: Math.round(parent.clientHeight * dpr),
      zoom: 1 / dpr,
    },
    banner: false,
    audio: { noAudio: true },
  });

  const fit = () => {
    const ratio = pixelRatio();
    const w = Math.round(parent.clientWidth * ratio);
    const h = Math.round(parent.clientHeight * ratio);
    if (w === 0 || h === 0) return;
    if (w !== game.scale.width || h !== game.scale.height) game.scale.resize(w, h);
    if (game.scale.zoom !== 1 / ratio) game.scale.setZoom(1 / ratio);
    // Keep the canvas exactly the parent's CSS size (setZoom only restyles on change).
    game.canvas.style.width = `${parent.clientWidth}px`;
    game.canvas.style.height = `${parent.clientHeight}px`;
  };
  const observer = new ResizeObserver(fit);
  observer.observe(parent);
  game.events.once(Phaser.Core.Events.READY, fit);
  game.events.once(Phaser.Core.Events.DESTROY, () => observer.disconnect());

  game.scene.add('world', WorldScene, true, deps);
  // Development builds only: lets browser tests map world positions to the screen.
  if (import.meta.env.DEV) (window as unknown as { __prodioGame?: Phaser.Game }).__prodioGame = game;
  return game;
}
