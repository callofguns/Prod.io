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
}

export const DEFAULT_SETTINGS: Settings = {
  zoom: 'auto',
  showHints: true,
  pauseOnBlur: true,
  motion: 'system',
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
