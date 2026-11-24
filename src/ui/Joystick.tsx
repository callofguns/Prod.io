import { useEffect, useRef, useState } from 'preact/hooks';
import type { ViewBridge } from '../app/ViewBridge';

/** How far (CSS px) the knob can travel from the centre. */
const TRAVEL = 40;

/** On-screen thumbstick. Writes its direction to the bridge; the world reads it every frame. */
export function Joystick({ bridge }: { bridge: ViewBridge }) {
  const base = useRef<HTMLDivElement>(null);
  const active = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const release = () => {
    active.current = null;
    bridge.joystick = { x: 0, y: 0 };
    setKnob({ x: 0, y: 0 });
  };
  useEffect(() => release, []);

  const track = (e: PointerEvent) => {
    const rect = base.current!.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(len, TRAVEL) / len;
    setKnob({ x: dx * k, y: dy * k });
    bridge.joystick = { x: (dx * k) / TRAVEL, y: (dy * k) / TRAVEL };
  };

  return (
    <div
      ref={base}
      class="joystick interactive"
      role="application"
      aria-label="Joystick: drag to walk"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          // Some browsers refuse capture for synthetic or already-released pointers; tracking still works.
        }
        track(e);
      }}
      onPointerMove={(e) => active.current === e.pointerId && track(e)}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div class="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
