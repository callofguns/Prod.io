import { dollars, type Cents } from '../sim/core/money';
import { BRANDS } from './brands';
import type { FridgeItem } from './living';

/**
 * Bayport for Milestone 2: two districts (Eastside, Midtown) you walk around,
 * the buildings you can enter, and how you get between districts.
 * See docs/GAME_DESIGN.md §10.
 */

export const DISTRICTS = {
  eastside: { name: 'Eastside', blurb: 'Cheap apartments, corner stores. Home.' },
  midtown: { name: 'Midtown', blurb: 'Music stores and cafés.' },
} as const;
export type DistrictId = keyof typeof DISTRICTS;

export type AreaId = 'apartment' | 'eastside' | 'midtown' | 'grocery' | 'gearStore' | 'cafe';

export interface AreaDef {
  name: string;
  district: DistrictId;
  /** Street areas are outdoors; the rest are interiors entered from a street. */
  outdoors: boolean;
  /** Opening hours for shops [open, close) in whole hours. */
  hours?: { open: number; close: number };
  /** The street spawn point you come out at when leaving this interior. */
  exitTo?: { area: AreaId; spawn: string };
}

export const AREAS: Record<AreaId, AreaDef> = {
  apartment: { name: 'Your apartment', district: 'eastside', outdoors: false, exitTo: { area: 'eastside', spawn: 'home' } },
  eastside: { name: DISTRICTS.eastside.name, district: 'eastside', outdoors: true },
  midtown: { name: DISTRICTS.midtown.name, district: 'midtown', outdoors: true },
  grocery: { name: BRANDS.grocery, district: 'eastside', outdoors: false, hours: { open: 7, close: 23 }, exitTo: { area: 'eastside', spawn: 'grocery' } },
  gearStore: { name: BRANDS.gearStore, district: 'midtown', outdoors: false, hours: { open: 10, close: 20 }, exitTo: { area: 'midtown', spawn: 'gearStore' } },
  cafe: { name: BRANDS.cafe, district: 'midtown', outdoors: false, hours: { open: 7, close: 19 }, exitTo: { area: 'midtown', spawn: 'cafe' } },
};

/** Street doors: object id on the street → the interior it leads into. */
export const DOORS: Record<string, AreaId> = {
  homeDoor: 'apartment',
  groceryDoor: 'grocery',
  gearStoreDoor: 'gearStore',
  cafeDoor: 'cafe',
};

export const isAreaId = (v: string): v is AreaId => v in AREAS;

// ---------- Getting around ----------

export const TRANSIT = {
  bus: {
    /** Real-world style flat fare. */
    fare: dollars(2.75),
    /** Buses leave every this many minutes, from 6:00 until 0:00. */
    headway: 15,
    firstHour: 6,
    lastHour: 24,
    rideMinutes: 20,
  },
  ride: {
    base: dollars(4.5),
    perTrip: dollars(8.25),
    /** Evening and late-night surge. */
    surge: (hour: number) => (hour >= 17 && hour < 20 ? 1.3 : hour >= 23 || hour < 5 ? 1.2 : 1),
    pickupMinutes: { min: 3, max: 9 },
    rideMinutes: 11,
  },
  walk: { minutes: 40, energy: 6 },
} as const;

export type TravelMode = 'bus' | 'ride' | 'walk';
export const TRAVEL_MODE_NAMES: Record<TravelMode, string> = { bus: 'Bus', ride: BRANDS.rideshare, walk: 'Walk' };

/** Where you arrive in a district for each way of getting there. */
export const ARRIVAL_SPAWN: Record<TravelMode, string> = { bus: 'busStop', ride: 'curb', walk: 'edge' };

/** Game minutes per real second while travelling (a 25-minute bus ride ≈ half a second). */
export const TRAVEL_TIME_SCALE = 60;

// ---------- Shops ----------

export interface ShopItem {
  id: string;
  name: string;
  detail: string;
  price: Cents;
  /** Goes into the fridge at home. */
  adds?: Partial<Record<FridgeItem, number>>;
  /** Eaten or drunk on the spot. */
  consume?: { food?: number; energy?: number; mood?: number; minutes: number };
}

/** Corner store: cheaper than delivery, but you carry it home yourself. */
export const GROCERY_ITEMS: ShopItem[] = [
  { id: 'groceries-small', name: 'Grocery basics', detail: '6 portions, into your fridge', price: dollars(21.4), adds: { groceries: 6 } },
  { id: 'groceries-week', name: 'Weekly groceries', detail: '14 portions, into your fridge', price: dollars(46.9), adds: { groceries: 14 } },
  { id: 'energy-drinks', name: 'Energy drinks', detail: '4 cans, into your fridge', price: dollars(7.6), adds: { energyDrinks: 4 } },
  { id: 'sandwich', name: 'Deli sandwich', detail: 'Eat it now · +35 food', price: dollars(6.5), consume: { food: 35, mood: 1, minutes: 10 } },
];

export const CAFE_ITEMS: ShopItem[] = [
  { id: 'coffee', name: 'Oat flat white', detail: 'Drink it here · +18 energy', price: dollars(4.75), consume: { energy: 18, mood: 2, minutes: 15 } },
  { id: 'cold-brew', name: 'Cold brew', detail: 'Drink it here · +24 energy', price: dollars(5.25), consume: { energy: 24, mood: 1, minutes: 15 } },
  { id: 'breakfast', name: 'Egg & cheese bagel', detail: 'Eat it here · +40 food', price: dollars(8.5), consume: { food: 40, mood: 3, minutes: 20 } },
  { id: 'hangout', name: 'Hang out with a pastry', detail: 'An hour off · +45 food, mood up', price: dollars(6.25), consume: { food: 45, mood: 8, minutes: 60 } },
];
