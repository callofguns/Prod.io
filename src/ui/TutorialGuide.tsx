import { useEffect, useRef, useState } from 'preact/hooks';
import type { Session } from '../app/Session';
import { MENTOR } from '../content/tutorial';
import { isCompact } from '../app/device';
import { useBridge, useSimEvents } from './hooks/useSim';

interface Ring {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Finds what the current step wants you to press, every frame (layouts move and scroll). */
function useRings(selectors: string[]): Ring[] {
  const [rings, setRings] = useState<Ring[]>([]);
  const scrolled = useRef(new WeakSet<Element>());
  const key = selectors.join('|');

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const next: Ring[] = [];
      selectors.forEach((sel, si) => {
        document.querySelectorAll(sel).forEach((el, ei) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          if (!scrolled.current.has(el)) {
            scrolled.current.add(el);
            el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }
          next.push({ key: `${si}-${ei}`, x: r.left, y: r.top, w: r.width, h: r.height });
        });
      });
      setRings((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key]);
  return rings;
}

type Corner = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
const CORNERS: Corner[] = ['bottom-left', 'bottom-right', 'top-left', 'top-right'];
const hit = (a: DOMRect, r: Ring) => a.left < r.x + r.w + 8 && a.right > r.x - 8 && a.top < r.y + r.h + 8 && a.bottom > r.y - 8;

/** Glowing rings around the targets. */
function Highlights({ rings }: { rings: Ring[] }) {
  return (
    <>
      {rings.map((r) => (
        <div key={r.key} class="tut-ring" aria-hidden="true"
          style={{ left: `${r.x - 4}px`, top: `${r.y - 4}px`, width: `${r.w + 8}px`, height: `${r.h + 8}px` }} />
      ))}
    </>
  );
}

/** Mo's card: the current step, progress, and Next / skip controls. Also offers the tour on a new game. */
export function TutorialGuide({ session }: { session: Session }) {
  const { sim, bridge, tutorial } = session;
  useSimEvents(sim, ['tutorialChanged', 'minute', 'beathubChanged', 'socialChanged', 'areaChanged']);
  useBridge(bridge);
  const [prefer, setPrefer] = useState(0);
  const [corner, setCorner] = useState<Corner>('bottom-left');
  const [small, setSmall] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const step = tutorial.step();
  const ctx = step ? tutorial.context() : null;
  const highlights = step && ctx && !small ? step.highlight?.(ctx) ?? [] : [];
  const rings = useRings(highlights);

  // Sit in the first corner (starting from the player's preference) that covers nothing highlighted.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const { width, height } = card.getBoundingClientRect();
    const W = window.innerWidth;
    const H = window.innerHeight;
    const order = [...CORNERS.slice(prefer), ...CORNERS.slice(0, prefer)];
    const fits = (c: Corner) => {
      const m = isCompact() ? 8 : 16;
      const x = c.endsWith('left') ? m : W - m - width;
      const y = c.startsWith('bottom') ? H - (isCompact() ? 8 : 52) - height : isCompact() ? 8 : 72;
      const box = new DOMRect(x, y, width, height);
      return !rings.some((r) => hit(box, r));
    };
    const best = order.find(fits) ?? order[0]!;
    if (best !== corner) setCorner(best);
  });

  if (tutorial.status === 'offered') {
    return (
      <aside class="tut-card bottom-left interactive" aria-label={`${MENTOR.name}, your mentor`}>
        <header class="tut-head">
          <span class="tut-avatar" aria-hidden="true">{MENTOR.initials}</span>
          <span class="tut-who"><strong>{MENTOR.name}</strong><span>{MENTOR.role}</span></span>
        </header>
        <p class="tut-text">
          Welcome to Bayport, {sim.state.player.alias}. First time? I can walk you through your first beat, selling it, and getting around town.
        </p>
        <div class="tut-actions">
          <button class="order" onClick={() => tutorial.begin()}>Show me</button>
          <button class="link-button" onClick={() => tutorial.skip()}>No thanks</button>
        </div>
        <p class="tut-note">You can start it any time from the pause menu.</p>
      </aside>
    );
  }

  if (!step || !ctx) return null;
  const isLast = tutorial.index === tutorial.total - 1;

  return (
    <>
      <Highlights rings={rings} />
      <aside ref={cardRef} class={`tut-card ${corner} ${small ? 'small' : ''} interactive`} aria-label={`Tutorial: ${MENTOR.name}`} aria-live="polite">
        <header class="tut-head">
          <span class="tut-avatar" aria-hidden="true">{MENTOR.initials}</span>
          <span class="tut-who">
            <strong>{MENTOR.name}</strong>
            <span>{step.section} · {tutorial.index + 1} of {tutorial.total}</span>
          </span>
          <button class="tut-icon" aria-label="Move to another corner" title="Move"
            onClick={() => setPrefer((CORNERS.indexOf(corner) + 1) % CORNERS.length)}>⇄</button>
          <button class="tut-icon" aria-label={small ? 'Expand' : 'Minimise'} title={small ? 'Expand' : 'Minimise'}
            onClick={() => setSmall(!small)}>{small ? '▴' : '▾'}</button>
        </header>
        {!small && (
          <>
            <div class="tut-progress" aria-hidden="true"><span style={{ width: `${((tutorial.index + 1) / tutorial.total) * 100}%` }} /></div>
            <p class="tut-text">{step.text(ctx)}</p>
            <div class="tut-actions">
              {!step.done && (
                <button class="order" disabled={!tutorial.canContinue()} onClick={() => tutorial.next()}>
                  {isLast ? 'Finish' : 'Next'}
                </button>
              )}
              {step.done && <span class="tut-doing">Your move</span>}
              {step.done && <button class="link-button" onClick={() => tutorial.next()}>Skip step</button>}
              <button class="link-button tut-end" onClick={() => tutorial.skip()}>End tutorial</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
