import { dollars, type Cents } from '../sim/core/money';

/**
 * BeatHub, the beat marketplace (a BeatStars parody). Real-world based
 * prices and plans, tuned so steady work covers rent and food around weeks
 * 3-4 ("tight", chosen by the owner). See docs/GAME_DESIGN.md §5.
 */

export const LEASE_TIERS = ['mp3', 'wav', 'trackout', 'unlimited'] as const;
export type LeaseTier = (typeof LEASE_TIERS)[number];

export interface LeaseDef {
  id: LeaseTier;
  name: string;
  terms: string;
  /** The price buyers expect for an average beat. */
  reference: Cents;
  /** Price steps the player can pick from. */
  steps: Cents[];
  /** Share of buyers who want this tier at reference prices. */
  share: number;
}

const steps = (...v: number[]) => v.map(dollars);

export const LEASES: Record<LeaseTier, LeaseDef> = {
  mp3: { id: 'mp3', name: 'MP3 lease', terms: 'Untagged MP3 · up to 50,000 streams · non-exclusive', reference: dollars(29.99), steps: steps(14.99, 19.99, 24.99, 29.99, 34.99, 39.99, 49.99, 59.99), share: 0.55 },
  wav: { id: 'wav', name: 'WAV lease', terms: 'WAV + MP3 · up to 250,000 streams · non-exclusive', reference: dollars(49.99), steps: steps(29.99, 34.99, 39.99, 49.99, 59.99, 69.99, 79.99, 99.99), share: 0.28 },
  trackout: { id: 'trackout', name: 'Trackout lease', terms: 'Stems (track-outs) · up to 500,000 streams · non-exclusive', reference: dollars(99.99), steps: steps(59.99, 79.99, 99.99, 119.99, 149.99, 199.99, 249.99), share: 0.12 },
  unlimited: { id: 'unlimited', name: 'Unlimited lease', terms: 'Stems · unlimited streams · still non-exclusive', reference: dollars(199.99), steps: steps(129.99, 149.99, 199.99, 249.99, 299.99, 399.99, 499.99), share: 0.05 },
};

export const DEFAULT_PRICES: Record<LeaseTier, Cents> = {
  mp3: LEASES.mp3.reference,
  wav: LEASES.wav.reference,
  trackout: LEASES.trackout.reference,
  unlimited: LEASES.unlimited.reference,
};

export const PLANS = {
  free: { name: 'Free', fee: 0.3, maxListings: 10, price: 0 },
  pro: { name: 'Pro', fee: 0, maxListings: Infinity, price: dollars(19.99), periodDays: 30 },
} as const;
export type PlanId = keyof typeof PLANS;

export const PROMOTIONS = [
  { days: 3, price: dollars(30) },
  { days: 7, price: dollars(60) },
  { days: 14, price: dollars(100) },
] as const;

/** Demand model. Expected store sales per day = BASE × (Σ listing weights)^CATALOG_EXP × reputation × marketing. */
export const DEMAND = {
  base: 0.09,
  catalogExponent: 0.6,
  /** Quality factor = (score / pivot) ^ exponent: good beats sell disproportionately well. */
  qualityPivot: 60,
  qualityExponent: 3,
  promotionMultiplier: 3,
  /** Price buyers accept scales with quality and your Business skill. */
  premium: (score: number, business: number) => 0.7 + 0.6 * (score / 100) + business / 400,
  /** Demand multiplier for a price relative to what buyers expect (peaks at the expected price for revenue). */
  priceFactor: (price: Cents, expected: number) => Math.min(2.5, Math.exp(1 - price / expected)),
  /** Store reputation from lifetime lease sales. */
  reputation: (sales: number) => Math.min(2, 1 + Math.log10(1 + sales) / 3),
  /** New uploads get pushed; listings fade to 40% attention over about a month (re-listing doesn't reset it). */
  freshness: (ageDays: number) => 0.4 + 0.6 * Math.exp(-ageDays / 14),
  marketing: (skill: number) => 1 + skill / 100,
  /** Plays per sale: conversion is 1.2% for weak beats up to 3.2% for great ones. */
  conversion: (score: number) => 0.012 + 0.02 * Math.min(1, score / 100),
  /** Similar beats in your own store split the same buyers. */
  uniquenessFloor: 0.5,
  /** Buyers shop more in the evening (hour of day → weight, averages 1). */
  hourWeight: (hour: number) => (hour < 7 ? 0.3 : hour < 12 ? 0.8 : hour < 18 ? 1.1 : 1.6) * (24 / 22.3),
} as const;

export const EXCLUSIVES = {
  /** Beats below this score don't attract exclusive interest. */
  minScore: 58,
  /** Offers per day for the whole store = rate × (best eligible quality factor)² × √reputation; rare by design. */
  rate: 0.008,
  maxOpen: 3,
  expiresMinutes: 48 * 60,
  /** Offer for a beat with quality factor 1 (score 60); scales with quality ^ 1.2 and its genre's trend. */
  baseOffer: dollars(400),
  /** Counter acceptance: 1 - (ratio - 1) × slope × (1 - business / 150). */
  counterSlope: 2.5,
  replyMinutes: { min: 60, max: 360 },
  /** After a rejected counter, chance the artist walks away instead of keeping the original offer. */
  walkAwayChance: 0.5,
  counterSteps: [0.1, 0.25, 0.5],
} as const;

export const SKILL_XP = { listing: 0.15, promotion: 0.4, counter: 0.5 } as const;

export const HISTORY_DAYS = 60;
export const SALES_LIMIT = 500;

// ---------- Buyer names (fictional) ----------
export const RAPPER_PREFIXES = ['Lil', 'Yung', 'Big', 'Baby', 'Lord', 'King', 'OT', 'Rich', '', '', '', ''];
export const RAPPER_NAMES = [
  'Kairo', 'Juno', 'Rellz', 'Tavi', 'Nexo', 'Mookie', 'Zaylo', 'Corvo', 'Dex', 'Bando', 'Saint', 'Ghosty',
  'Marlo', 'Vito', 'Keyz', 'Rocco', 'Shiloh', 'Tre Vibe', 'Nova', 'Brisco', 'Dreamz', 'Kace', 'Lucci Lane', 'Omari',
];
export const SINGER_FIRST = ['Amara', 'Jade', 'Nia', 'Selene', 'Tasha', 'Coco', 'Mila', 'Aria', 'Kenzo', 'Dante', 'Luca', 'Imani', 'Rae', 'Solange'];
export const SINGER_LAST = ['Rivers', 'Belle', 'Monroe', 'Vale', 'Sky', 'Hart', 'Lane', 'Cruz', 'Moon', 'Starling', 'West', 'Day'];
