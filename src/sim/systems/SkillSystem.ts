import type { Simulation, System } from '../Simulation';
import { fail, ok, type CommandResult } from '../core/commands';
import { formatMoney } from '../core/money';
import { BRANDS } from '../../content/brands';
import { COURSES, PRACTICE, TUTORIAL, courseById, learnRate, type Course } from '../../content/learning';
import { DRUM_LANES, type GenreId, type Pattern } from '../../content/music';
import { SKILLS, type SkillId } from '../../content/skills';

export type SkillGains = Partial<Record<SkillId, number>>;

const skillName = (id: SkillId) => SKILLS.find((s) => s.id === id)!.name;
const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Skill growth: practice XP from finished beats, free tutorials and paid
 * courses, all with diminishing returns at higher levels.
 */
export class SkillSystem implements System {
  readonly id = 'skills';

  constructor(private sim: Simulation) {
    sim.handle('startTutorial', ({ skill }) => this.startTutorial(skill));
    sim.handle('buyCourse', ({ courseId }) => this.buyCourse(courseId));
    sim.handle('startCourseSession', ({ courseId }) => this.startSession(courseId));
    sim.events.on('minute', ({ totalMinutes }) => {
      const a = sim.state.activity;
      if (a?.kind === 'studying' && totalMinutes >= a.until) this.finishStudying();
    });
  }

  /** Adds XP to a skill (after diminishing returns) and returns how much it rose. */
  gain(skill: SkillId, baseXp: number): number {
    const skills = this.sim.state.player.skills;
    const before = skills[skill];
    const delta = baseXp * learnRate(before);
    skills[skill] = Math.min(100, before + delta);
    if (Math.floor(skills[skill]) > Math.floor(before)) {
      this.sim.events.emit('skillLevelUp', { skill, level: Math.floor(skills[skill]) });
    }
    this.sim.events.emit('skillsChanged', { skills });
    return delta;
  }

  /** XP for finishing a beat: what you worked on is what improves. */
  practice(pattern: Pattern, genre: GenreId): SkillGains {
    const drumHits = DRUM_LANES.reduce((n, l) => n + pattern.drums[l].filter((v) => v > 0).length, 0);
    const melodyNotes = pattern.melody.flat().length;
    const bassNotes = pattern.bass.filter((d) => d >= 0).length;
    const recent = this.sim.state.studio.beats.slice(-3).map((b) => b.settings.genre);
    const bonus = recent.length > 0 && !recent.includes(genre) ? PRACTICE.newGenreBonus : 1;
    const base: SkillGains = {
      drums: PRACTICE.drums * Math.min(1, drumHits / PRACTICE.fullDrumHits),
      melody: PRACTICE.melody * Math.min(1, melodyNotes / PRACTICE.fullMelodyNotes),
      soundDesign: PRACTICE.soundDesign * (bassNotes > 0 ? 1 : 0.5),
      mixing: PRACTICE.mixing,
      mastering: PRACTICE.mastering,
    };
    const gains: SkillGains = {};
    for (const [skill, xp] of Object.entries(base) as [SkillId, number][]) {
      if (xp > 0) gains[skill] = round1(this.gain(skill, xp * bonus));
    }
    return gains;
  }

  // ---------- Tutorials ----------

  tutorialBlocker(skill: SkillId): string | null {
    if (this.sim.state.player.skills[skill] >= TUTORIAL.maxSkill) {
      return `Free tutorials can't teach you more ${skillName(skill)}. Try a course.`;
    }
    return this.studyBlocker();
  }

  /** XP a tutorial would give right now (for the UI). */
  tutorialGain(skill: SkillId): number {
    return round1(TUTORIAL.xp * learnRate(this.sim.state.player.skills[skill]));
  }

  private studyBlocker(): string | null {
    if (this.sim.activity.isBusy()) return 'You are busy.';
    if (this.sim.state.needs.energy < TUTORIAL.minEnergy) return "You're too tired to learn anything. Get some sleep.";
    return null;
  }

  private startTutorial(skill: SkillId): CommandResult {
    if (!SKILLS.some((s) => s.id === skill)) return fail(`Unknown skill ${skill}`);
    const blocked = this.tutorialBlocker(skill);
    if (blocked) return fail(blocked);
    this.study(TUTORIAL.minutes, skill, null, `${BRANDS.video} tutorials: ${skillName(skill)}`);
    return ok;
  }

  // ---------- Courses ----------

  owned(courseId: string) {
    return this.sim.state.learning.courses.find((c) => c.id === courseId);
  }

  /** Session XP after the over-level penalty, before diminishing returns. */
  private sessionXp(course: Course): number {
    return this.sim.state.player.skills[course.skill] > course.maxSkill ? course.xp * 0.25 : course.xp;
  }

  courseGain(course: Course): number {
    return round1(this.sessionXp(course) * learnRate(this.sim.state.player.skills[course.skill]));
  }

  private buyCourse(courseId: string): CommandResult {
    const course = courseById(courseId);
    if (!course) return fail(`Unknown course ${courseId}`);
    if (this.owned(courseId)) return fail('You already own this course.');
    if (this.sim.state.player.cash < course.price) return fail(`Card declined. ${course.name} costs ${formatMoney(course.price)}.`);
    this.sim.economy.record(-course.price, `${BRANDS.courses}: ${course.name}`, 'education');
    this.sim.state.learning.courses.push({ id: courseId, sessionsDone: 0 });
    this.sim.events.emit('learningChanged', {});
    return ok;
  }

  private startSession(courseId: string): CommandResult {
    const course = courseById(courseId);
    const progress = this.owned(courseId);
    if (!course || !progress) return fail('Buy the course first.');
    if (progress.sessionsDone >= course.sessions) return fail('You already finished this course.');
    const blocked = this.studyBlocker();
    if (blocked) return fail(blocked);
    this.study(course.sessionMinutes, course.skill, course.id, `${course.name}: session ${progress.sessionsDone + 1} of ${course.sessions}`);
    return ok;
  }

  // ---------- Studying activity ----------

  private study(minutes: number, skill: SkillId, courseId: string | null, label: string): void {
    const now = this.sim.state.clock.totalMinutes;
    this.sim.state.activity = { kind: 'studying', startedAt: now, until: now + minutes, skill, courseId, label };
    this.sim.state.clock.paused = false;
    this.sim.events.emit('activityChanged', { activity: this.sim.state.activity });
  }

  private finishStudying(): void {
    const a = this.sim.state.activity;
    if (a?.kind !== 'studying') return;
    this.sim.state.activity = null;
    if (a.courseId === null) {
      const gained = this.gain(a.skill, TUTORIAL.xp);
      this.sim.events.emit('notice', { text: `+${round1(gained)} ${skillName(a.skill)} from tutorials.`, tone: 'good' });
    } else {
      const course = courseById(a.courseId)!;
      const progress = this.owned(a.courseId)!;
      const xp = this.sessionXp(course);
      const gained = this.gain(course.skill, xp);
      for (const extra of course.also ?? []) this.gain(extra, xp * 0.25);
      progress.sessionsDone += 1;
      this.sim.events.emit('notice', { text: `+${round1(gained)} ${skillName(course.skill)} from ${course.name}.`, tone: 'good' });
      if (progress.sessionsDone >= course.sessions) {
        this.sim.needs.change({ mood: 3 });
        this.sim.messages.send(BRANDS.courses, `Course complete: ${course.name}`, `Congratulations on finishing ${course.name}. Your certificate is in your account. Ready for the next one?`);
      }
      this.sim.events.emit('learningChanged', {});
    }
    this.sim.events.emit('activityChanged', { activity: null });
  }

  /** Courses grouped for the shop: what you own first, then by price. */
  catalogue(): Course[] {
    return [...COURSES].sort((a, b) => Number(!this.owned(a.id)) - Number(!this.owned(b.id)) || a.price - b.price);
  }
}
