/** Beat production balance. */
export const PRODUCTION = {
  /** Work for a beginner before skills and needs adjust it. */
  baseMinutes: 240,
  minEnergy: 15,
  /** Energy drains this much faster than normal while producing. */
  energyFactor: 1.6,
  finishMood: 3,
  /** Game minutes per real second while finishing a beat. */
  timeScale: 120,
} as const;
