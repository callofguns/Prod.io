/** 0 = full daylight, 1 = deep night, with dawn (5-8) and dusk (17-20) blends. */
export function darknessAt(hour: number): number {
  if (hour >= 8 && hour < 17) return 0;
  if (hour >= 20 || hour < 5) return 1;
  if (hour >= 17) return (hour - 17) / 3;
  return 1 - (hour - 5) / 3;
}
