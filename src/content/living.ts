import { dollars, type Cents } from '../sim/core/money';
import { BRANDS } from './brands';

/**
 * Cost of living and personal needs. Real-world based (Eastside studio
 * apartment, US delivery-app prices) and tuned in playtests. See
 * docs/GAME_DESIGN.md §3.1.
 */

// ---------- Needs (0-100) ----------
export const NEEDS = {
  start: { energy: 85, food: 70, mood: 65 },
  /** Points per in-game minute. */
  energyDrainAwake: 100 / (17 * 60),
  energyGainAsleep: 100 / (7.5 * 60),
  foodDrainAwake: 100 / (14 * 60),
  foodDrainAsleep: 100 / (28 * 60),
  /** Energy drains this much faster when starving. */
  starvingEnergyFactor: 1.5,
  /** Mood moves toward its target by this many points per in-game hour. */
  moodPerHour: 1.5,
  moodBaseline: 70,
  moodPenalty: { hungry: 25, exhausted: 20, overdueBills: 15 },
  lowThreshold: 20,
  /** Can't sleep when energy is at or above this. */
  wideAwake: 90,
  /** Passing out at 0 energy: sleep this long where you stand. */
  passOutMinutes: 6 * 60,
  passOutMoodHit: 10,
  goodSleepMinutes: 7 * 60,
  goodSleepMood: 5,
} as const;

/** While asleep the clock runs this many game minutes per real second (8 hours ≈ 4 seconds). */
export const SLEEP_TIME_SCALE = 120;

// ---------- Food ----------
export type FridgeItem = 'groceries' | 'takeout' | 'energyDrinks';

export interface MenuItem {
  id: string;
  name: string;
  detail: string;
  price: Cents;
  kind: 'groceries' | 'takeout';
  adds: Partial<Record<FridgeItem, number>>;
}

/** DashBite prices include delivery and service fees. */
export const DELIVERY_MENU: MenuItem[] = [
  { id: 'groceries-small', name: 'Grocery basics', detail: '6 portions to cook at home', price: dollars(34.8), kind: 'groceries', adds: { groceries: 6 } },
  { id: 'groceries-week', name: 'Weekly groceries', detail: '14 portions to cook at home', price: dollars(72.5), kind: 'groceries', adds: { groceries: 14 } },
  { id: 'energy-drinks', name: 'Energy drinks', detail: '4 cans · +25 energy each', price: dollars(9.8), kind: 'groceries', adds: { energyDrinks: 4 } },
  { id: 'burger', name: 'Smash burger & fries', detail: '1 meal', price: dollars(17.4), kind: 'takeout', adds: { takeout: 1 } },
  { id: 'shawarma', name: 'Chicken shawarma bowl', detail: '1 meal', price: dollars(15.9), kind: 'takeout', adds: { takeout: 1 } },
  { id: 'pizza', name: 'Large pepperoni pizza', detail: '2 meals', price: dollars(24.6), kind: 'takeout', adds: { takeout: 2 } },
];

export const DELIVERY_MINUTES = { min: 30, max: 50 } as const;

export const MEALS = {
  cook: { minutes: 30, food: 50, mood: 2 },
  snack: { minutes: 10, food: 22, mood: 0 },
  takeout: { minutes: 20, food: 60, mood: 4 },
  energyDrink: { minutes: 2, energy: 25, mood: 0 },
} as const;

export const STARTING_FRIDGE: Record<FridgeItem, number> = { groceries: 4, takeout: 0, energyDrinks: 0 };

// ---------- Bills ----------
export const RENT = {
  label: 'Rent · Eastside studio',
  weekly: dollars(265),
  /** Charged every Monday at this hour, from the second Monday on. */
  hour: 9,
  lateFee: dollars(50),
  landlord: 'Gary (landlord)',
} as const;

export const MONTHLY_BILLS = [
  { id: 'phone', label: `${BRANDS.carrier} phone plan`, amount: dollars(45), lateFee: dollars(15) },
] as const;

/** Bills and debt payments run at this hour (1st of the month for monthly ones). */
export const BILLING_HOUR = 9;
export const LOAN_LATE_FEE = dollars(25);

/** Unpaid bills move into this debt, which the bank collects as soon as you can cover it. */
export const OVERDUE = { id: 'overdue', label: 'Overdue bills', apr: 0.18 } as const;

// ---------- Credit and loans ----------
export const CREDIT = {
  min: 300,
  max: 850,
  start: { selfTaught: 640, dropout: 680, clubDj: 620 } as Record<string, number>,
  onTimeGain: 3,
  latePenalty: 40,
} as const;

export const LOAN = {
  amounts: [dollars(500), dollars(1_000), dollars(2_500), dollars(5_000)],
  termMonths: 12,
  /** APR from 8% (perfect credit) up to 36% (credit 300). */
  aprAt: (credit: number) => 0.08 + ((850 - credit) / 550) * 0.28,
  /** Largest loan the bank will offer at a credit score. 0 = declined. */
  maxAt: (credit: number) =>
    credit >= 700 ? dollars(5_000) : credit >= 640 ? dollars(2_500) : credit >= 580 ? dollars(1_000) : credit >= 520 ? dollars(500) : 0,
} as const;

/** Standard amortised monthly payment, rounded up to the cent. */
export function monthlyPayment(principal: Cents, apr: number, months: number): Cents {
  const r = apr / 12;
  if (r === 0) return Math.ceil(principal / months);
  return Math.ceil((principal * r) / (1 - Math.pow(1 + r, -months)));
}
