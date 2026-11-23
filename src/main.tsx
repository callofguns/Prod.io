import { render } from 'preact';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/doto/700.css';
import '@fontsource/doto/800.css';
import '@fontsource/schibsted-grotesk/400.css';
import '@fontsource/schibsted-grotesk/600.css';
import '@fontsource/schibsted-grotesk/700.css';
import './ui/styles/ui.css';
import { App } from './ui/App';
import { applyMotionSetting, settings } from './app/settings';

const gameRoot = document.getElementById('game');
const uiRoot = document.getElementById('ui');
if (!gameRoot || !uiRoot) throw new Error('index.html is missing #game or #ui');

applyMotionSetting(settings.get());
settings.subscribe(applyMotionSetting);

render(<App gameRoot={gameRoot} />, uiRoot);
