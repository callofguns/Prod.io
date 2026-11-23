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

export const MenuGlyph = () => (
  <svg class="glyph" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="3" width="10" height="2" /><rect x="2" y="6" width="10" height="2" /><rect x="2" y="9" width="10" height="2" /></svg>
);

export const PhoneGlyph = () => (
  <svg class="glyph" viewBox="0 0 14 14" aria-hidden="true"><path d="M4 1h6a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm0 2v7h6V3z" /><rect x="6" y="11" width="2" height="1" /></svg>
);
