/**
 * Device facts the UI adapts to. Phones play in landscape; "compact" is the
 * short landscape screen of a phone (and any short window).
 */
export const PORTRAIT_PHONE = '(orientation: portrait) and (max-width: 600px)';
export const COMPACT = '(max-height: 520px)';
export const TOUCH = '(pointer: coarse)';

const query = (q: string) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null);

export const isTouch = () => query(TOUCH)?.matches ?? false;
export const isCompact = () => query(COMPACT)?.matches ?? false;
export const isPortraitPhone = () => query(PORTRAIT_PHONE)?.matches ?? false;

/** Calls `listener` whenever the media query starts or stops matching. */
export function onMediaChange(q: string, listener: (matches: boolean) => void): () => void {
  const mq = query(q);
  if (!mq) return () => {};
  const handler = (e: MediaQueryListEvent) => listener(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

/** Safari-only pinch gestures zoom the page even with touch-action set; stop them. */
export function blockPagePinchZoom(): void {
  const stop = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', stop, { passive: false });
  document.addEventListener('gesturechange', stop, { passive: false });
}
