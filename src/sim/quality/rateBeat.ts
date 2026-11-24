import { GENRES, type BeatSettings, type Pattern } from '../../content/music';
import {
  COMPOSITION_SHARE, PART_SKILLS, PART_WEIGHTS, PARTS, execution, gradeFor, needsFactor,
  type Grade, type Part,
} from '../../content/quality';
import { SKILLS, type SkillId, type Skills } from '../../content/skills';
import { analyzePattern } from './analyzePattern';
import { GEAR_BASE_FACTOR } from '../../content/gear';
import { LOOP_RATING, loopById } from '../../content/loops';

export interface BeatQuality {
  /** 0-100. */
  score: number;
  grade: Grade;
  /** Final 0-100 per part, after skills. */
  parts: Record<Part, number>;
  /** 0-100 per part from the pattern alone. */
  composition: Record<Part, number>;
  tips: string[];
  highlights: string[];
  /** Points out the skill holding the beat back most, if any. */
  skillTip: string | null;
}

const skillMix = (part: Part, skills: Skills) =>
  Object.entries(PART_SKILLS[part]).reduce((sum, [id, w]) => sum + (skills[id as SkillId] ?? 0) * (w ?? 0), 0);

/**
 * Rates a finished beat. "Skills first": each part is 30% pattern and 70%
 * execution from the relevant skills, then needs, gear (and a LoopVault loop, if used) and a little
 * session-to-session variance apply.
 */
export function rateBeat(
  settings: BeatSettings,
  pattern: Pattern,
  skills: Skills,
  productivity: number,
  variance = 0,
  gearFactor: number = GEAR_BASE_FACTOR,
): BeatQuality {
  const analysis = analyzePattern(settings, pattern);
  const loop = pattern.loopId ? loopById(pattern.loopId) : undefined;
  const composition = { ...analysis.composition };
  if (loop && loop.genre !== settings.genre) composition.genre = Math.max(0, composition.genre - LOOP_RATING.offGenrePenalty);
  const weights = PART_WEIGHTS[settings.genre];
  const exec = {} as Record<Part, number>;
  const parts = {} as Record<Part, number>;
  let raw = 0;
  for (const part of PARTS) {
    exec[part] = execution(skillMix(part, skills));
    let value = COMPOSITION_SHARE * composition[part] + (1 - COMPOSITION_SHARE) * exec[part];
    // A loop is a finished, professional layer: it carries much of the melody.
    if (part === 'melody' && loop) value = (1 - LOOP_RATING.melodyShare) * value + LOOP_RATING.melodyShare * loop.quality;
    parts[part] = Math.round(value);
    raw += weights[part] * parts[part];
  }
  const score = Math.max(0, Math.min(100, Math.round(raw * needsFactor(productivity) * gearFactor + variance)));

  // Which skill would lift this beat the most?
  const weakest = [...PARTS].sort((a, b) => weights[b] * (100 - exec[b]) - weights[a] * (100 - exec[a]))[0]!;
  const mainSkill = Object.entries(PART_SKILLS[weakest]).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]![0] as SkillId;
  const skillName = SKILLS.find((s) => s.id === mainSkill)!.name;
  const skillTip = exec[weakest] < 70
    ? `Your ${skillName} (${Math.floor(skills[mainSkill])}) is holding this beat back. Making beats, tutorials and courses all raise it.`
    : null;

  return {
    score,
    grade: gradeFor(score).grade,
    parts,
    composition,
    tips: [
      ...(loop && loop.genre !== settings.genre ? [`The "${loop.name}" loop is made for another genre, so the beat fits ${GENRES[settings.genre].name} less.`] : []),
      ...analysis.tips,
    ].slice(0, 3),
    highlights: analysis.highlights.slice(0, 2),
    skillTip,
  };
}
