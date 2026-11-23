import { dollars, type Cents } from '../sim/core/money';
import { zeroSkills, type Skills } from './skills';

export type DebtKind = 'student' | 'personal' | 'overdue';

export interface StartingDebt {
  id: string;
  label: string;
  kind: DebtKind;
  balance: Cents;
  /** Annual interest rate, e.g. 0.055 for 5.5%. */
  apr: number;
  minMonthlyPayment: Cents;
}

export interface Background {
  id: 'selfTaught' | 'dropout' | 'clubDj';
  name: string;
  summary: string;
  cash: Cents;
  skills: Partial<Skills>;
  debts: StartingDebt[];
  /** Plain-language notes on what the background means in play. */
  notes: string[];
}

/** Starting backgrounds. Numbers are real-world flavoured and tuned in playtests. */
export const BACKGROUNDS: readonly Background[] = [
  {
    id: 'selfTaught',
    name: 'Self-taught',
    summary: 'Years of YouTube tutorials and a cracked DAW. Strong drums, no safety net.',
    cash: dollars(1_400),
    skills: { drums: 18, soundDesign: 15, melody: 8, mixing: 6, mastering: 2, marketing: 5, business: 3 },
    debts: [],
    notes: ['Best drum programming and sound design', 'No debt'],
  },
  {
    id: 'dropout',
    name: 'Music school dropout',
    summary: 'Two years of theory and engineering classes, then you left. The loans stayed.',
    cash: dollars(600),
    skills: { melody: 22, mixing: 14, drums: 8, soundDesign: 8, mastering: 6, vocalEngineering: 6, marketing: 2, business: 4 },
    debts: [
      {
        id: 'student-loan',
        label: 'Student loan',
        kind: 'student',
        balance: dollars(18_500),
        apr: 0.055,
        minMonthlyPayment: dollars(190),
      },
    ],
    notes: ['Best melody and mixing', '$18,500 student loan, $190/month'],
  },
  {
    id: 'clubDj',
    name: 'Club DJ',
    summary: 'You know what moves a room and who runs the clubs. Producing is new to you.',
    cash: dollars(2_100),
    skills: { marketing: 18, business: 8, drums: 10, soundDesign: 8, mixing: 8, melody: 4, mastering: 3 },
    debts: [],
    notes: ['Best marketing and most cash', 'Weakest at making music', 'Club contacts matter once the city opens'],
  },
];

export const backgroundById = (id: Background['id']): Background => {
  const bg = BACKGROUNDS.find((b) => b.id === id);
  if (!bg) throw new Error(`Unknown background ${id}`);
  return bg;
};

export function startingSkills(bg: Background): Skills {
  return { ...zeroSkills(), ...bg.skills };
}
