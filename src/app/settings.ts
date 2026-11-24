/**
 * Player preferences. These belong to this browser, not to the playthrough,
 * so they live in localStorage rather than in the save file.
 */
export type ZoomSetting = 'auto' | 2 | 3 | 4;
export type MotionSetting = 'system' | 'reduce' | 'full';

export interface Settings {
  zoom: ZoomSetting;
  showHints: boolean;
  pauseOnBlur: boolean;
  motion: MotionSetting;
  /** Master volume for all game audio, 0-1. */
  volume: number;
  /** Show an on-screen joystick for walking (tapping to walk always works too). */
  joystick: boolean;
  /** Shows a button for the debug panel (the backtick key does this on a keyboard). */
  devTools: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  zoom: 'auto',
  showHints: true,
  pauseOnBlur: true,
  motion: 'system',
  volume: 0.8,
  joystick: false,
  devTools: false,
};

const KEY = 'prod-io:settings';
type Listener = (settings: Settings) => void;

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

class SettingsStore {
  private current: Settings = load();
  private listeners = new Set<Listener>();

  get(): Settings {
    return this.current;
  }

  update(patch: Partial<Settings>): void {
    this.current = { ...this.current, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(this.current));
    } catch {
      // Storage blocked (private mode): the change still applies for this visit.
    }
    this.listeners.forEach((l) => l(this.current));
  }

  reset(): void {
    this.update({ ...DEFAULT_SETTINGS });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }
}

export const settings = new SettingsStore();

/** Reflects the motion preference onto <html> so CSS can honour it. */
export function applyMotionSetting(s: Settings): void {
  const reduce = s.motion === 'reduce' || (s.motion === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  document.documentElement.dataset.motion = reduce ? 'reduce' : 'full';
}
