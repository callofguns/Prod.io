import { render } from 'preact';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/doto/700.css';
import '@fontsource/doto/800.css';
import '@fontsource/schibsted-grotesk/400.css';
import '@fontsource/schibsted-grotesk/600.css';
import '@fontsource/schibsted-grotesk/700.css';
import './ui/styles/ui.css';
import './ui/styles/mobile.css';
import { App } from './ui/App';
import { applyMotionSetting, settings } from './app/settings';
import { blockPagePinchZoom } from './app/device';

const gameRoot = document.getElementById('game');
const uiRoot = document.getElementById('ui');
if (!gameRoot || !uiRoot) throw new Error('index.html is missing #game or #ui');

blockPagePinchZoom();
applyMotionSetting(settings.get());
settings.subscribe(applyMotionSetting);

render(<App gameRoot={gameRoot} />, uiRoot);

// Installed web app: play offline, and ask the browser to keep the save even under storage pressure.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline play is a bonus; the game works without it.
    });
  });
}
void navigator.storage?.persist?.().catch(() => false);
