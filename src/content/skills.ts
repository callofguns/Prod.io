/** The producer's skills, each 0-100. See docs/GAME_DESIGN.md §3.2. */
export const SKILLS = [
  { id: 'drums', name: 'Drum Programming', short: 'Drums' },
  { id: 'melody', name: 'Melody & Composition', short: 'Melody' },
  { id: 'soundDesign', name: 'Sound Design', short: 'Sound design' },
  { id: 'mixing', name: 'Mixing', short: 'Mixing' },
  { id: 'mastering', name: 'Mastering', short: 'Mastering' },
  { id: 'vocalEngineering', name: 'Vocal Engineering', short: 'Vocals' },
  { id: 'marketing', name: 'Marketing', short: 'Marketing' },
  { id: 'business', name: 'Business & Negotiation', short: 'Business' },
  { id: 'management', name: 'Management', short: 'Management' },
] as const;

export type SkillId = (typeof SKILLS)[number]['id'];
export type Skills = Record<SkillId, number>;

export function zeroSkills(): Skills {
  return Object.fromEntries(SKILLS.map((s) => [s.id, 0])) as Skills;
}
