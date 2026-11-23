const SEGMENTS = 10;

/** A mixer-style LED ladder for a 0-100 level. Segments turn red when the level is low. */
export function Meter({ label, value, low = 20 }: { label: string; value: number; low?: number }) {
  const lit = Math.ceil(Math.max(0, Math.min(100, value)) / (100 / SEGMENTS));
  const danger = value < low;
  return (
    <div class="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <span class="meter-label">{label}</span>
      <span class={`meter-leds ${danger ? 'danger' : ''}`} aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => <span key={i} class={i < lit ? 'on' : ''} />)}
      </span>
    </div>
  );
}
