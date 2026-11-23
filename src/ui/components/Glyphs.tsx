/** Transport glyphs drawn on the rubber keys. */
export const PauseGlyph = () => (
  <svg class="glyph" viewBox="0 0 14 14" aria-hidden="true"><rect x="3" y="2" width="3" height="10" /><rect x="8" y="2" width="3" height="10" /></svg>
);

export function PlayGlyph({ count }: { count: number }) {
  const w = 14 * count - 4 * (count - 1);
  return (
    <svg class="glyph" style={{ width: `${w}px` }} viewBox={`0 0 ${w} 14`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <polygon key={i} points={`${i * 10 + 2},2 ${i * 10 + 12},7 ${i * 10 + 2},12`} />
      ))}
    </svg>
  );
}
