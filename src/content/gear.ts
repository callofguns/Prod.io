import { dollars, type Cents } from '../sim/core/money';
import { BRANDS } from './brands';

/**
 * Studio gear sold at the gear store (Noise Depot). Each piece lifts beat
 * quality a little and some make beats faster. Real-world style prices.
 * See docs/GAME_DESIGN.md §4.3.
 */

export const GEAR_SLOTS = ['computer', 'daw', 'headphones', 'monitors', 'interface', 'midi'] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];

export const GEAR_SLOT_NAMES: Record<GearSlot, string> = {
  computer: 'Computer',
  daw: 'Software',
  headphones: 'Headphones',
  monitors: 'Speakers',
  interface: 'Audio interface',
  midi: 'MIDI keyboard',
};

export interface GearItem {
  id: string;
  slot: GearSlot;
  name: string;
  blurb: string;
  price: Cents;
  /** Added to the gear quality factor (starter setup = 0.95). */
  quality: number;
  /** Multiplies the time a beat takes (1 = no change). */
  speed: number;
  /** Another item you need to own first. */
  requires?: string;
}

/** What you own at the start. Starter items are free and can't be bought. */
export const STARTER_GEAR_IDS = ['laptop-old', 'daw-free', 'earbuds'] as const;

export const GEAR_BASE_FACTOR = 0.95;
export const GEAR_MAX_FACTOR = 1.1;

export const GEAR: GearItem[] = [
  { id: 'laptop-old', slot: 'computer', name: 'Old laptop', blurb: 'Fans scream when you add a third plugin.', price: 0, quality: 0, speed: 1 },
  { id: 'laptop-refurb', slot: 'computer', name: 'Refurbished laptop', blurb: 'Fast enough that projects stop freezing.', price: dollars(649), quality: 0.02, speed: 0.88 },
  { id: 'desktop-studio', slot: 'computer', name: 'Studio desktop', blurb: 'Huge projects, no lag, quick bounces.', price: dollars(1599), quality: 0.04, speed: 0.78 },

  { id: 'daw-free', slot: 'daw', name: 'Free DAW', blurb: 'Gets the job done, slowly.', price: 0, quality: 0, speed: 1 },
  { id: 'daw-producer', slot: 'daw', name: `${BRANDS.daw} Producer`, blurb: 'Pattern workflow, better stock sounds.', price: dollars(199), quality: 0.015, speed: 0.9 },

  { id: 'earbuds', slot: 'headphones', name: 'Earbuds', blurb: 'You can barely hear the 808.', price: 0, quality: 0, speed: 1 },
  { id: 'headphones-studio', slot: 'headphones', name: 'Studio headphones', blurb: 'Closed-back. You finally hear the low end.', price: dollars(99), quality: 0.015, speed: 1 },
  { id: 'headphones-reference', slot: 'headphones', name: 'Reference headphones', blurb: 'Open-back and flat. Mixes translate.', price: dollars(249), quality: 0.025, speed: 1 },

  { id: 'interface-2in', slot: 'interface', name: '2-in USB interface', blurb: 'Clean outputs and low latency.', price: dollars(129), quality: 0.01, speed: 0.97 },

  { id: 'monitors-5', slot: 'monitors', name: '5" studio monitors', blurb: 'Hear your mix in the room.', price: dollars(229), quality: 0.02, speed: 1, requires: 'interface-2in' },
  { id: 'monitors-8', slot: 'monitors', name: '8" studio monitors', blurb: 'Full range, tight bass, honest mids.', price: dollars(549), quality: 0.035, speed: 1, requires: 'interface-2in' },

  { id: 'midi-mini', slot: 'midi', name: '25-key mini keyboard', blurb: 'Play melodies in instead of clicking.', price: dollars(89), quality: 0.005, speed: 0.92 },
  { id: 'midi-49', slot: 'midi', name: '49-key keyboard', blurb: 'Two hands, drum pads, knobs.', price: dollars(229), quality: 0.01, speed: 0.86 },
];

export const gearById = (id: string): GearItem | undefined => GEAR.find((g) => g.id === id);
