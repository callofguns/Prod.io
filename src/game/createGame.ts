import Phaser from 'phaser';
import { ApartmentScene, type SceneDeps } from './scenes/ApartmentScene';

/** Boots Phaser into the given element and starts in the player's apartment. */
export function createGame(parent: HTMLElement, deps: SceneDeps): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#121018',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    banner: false,
    audio: { noAudio: true },
  });
  game.scene.add('apartment', ApartmentScene, true, deps);
  return game;
}
