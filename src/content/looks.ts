/**
 * Character appearance options. The saved game stores option ids; the art
 * layer turns them into colours and shapes.
 */
export interface Swatch {
  id: string;
  name: string;
  color: string;
  shade: string;
}

export const SKIN_TONES: Swatch[] = [
  { id: 'tone1', name: 'Porcelain', color: '#f1c9a5', shade: '#d9a886' },
  { id: 'tone2', name: 'Light', color: '#e0ac7e', shade: '#c48d62' },
  { id: 'tone3', name: 'Tan', color: '#c68a5a', shade: '#a86f45' },
  { id: 'tone4', name: 'Brown', color: '#a0673f', shade: '#83512f' },
  { id: 'tone5', name: 'Deep brown', color: '#8d5a3b', shade: '#74472d' },
  { id: 'tone6', name: 'Dark', color: '#5e3a26', shade: '#4a2c1c' },
];

export const HAIR_COLORS: Swatch[] = [
  { id: 'black', name: 'Black', color: '#1f1a1a', shade: '#121010' },
  { id: 'brown', name: 'Brown', color: '#5a3a24', shade: '#432a1a' },
  { id: 'blonde', name: 'Blonde', color: '#d8b55e', shade: '#b8953f' },
  { id: 'red', name: 'Red', color: '#a8452a', shade: '#86331d' },
  { id: 'bleached', name: 'Bleached', color: '#ece6d2', shade: '#cfc7ad' },
  { id: 'blue', name: 'Dyed blue', color: '#3f6bd8', shade: '#2f52aa' },
];

export const CLOTHING_COLORS: Swatch[] = [
  { id: 'red', name: 'Red', color: '#d8432b', shade: '#b0351f' },
  { id: 'black', name: 'Black', color: '#2c2a33', shade: '#1d1c22' },
  { id: 'white', name: 'White', color: '#e8e4d8', shade: '#c6c1b2' },
  { id: 'olive', name: 'Olive', color: '#6b7a3a', shade: '#55622c' },
  { id: 'navy', name: 'Navy', color: '#2d3348', shade: '#1f2434' },
  { id: 'purple', name: 'Purple', color: '#6a4c9c', shade: '#523a7a' },
  { id: 'amber', name: 'Amber', color: '#e09a2d', shade: '#b87a1d' },
  { id: 'denim', name: 'Denim', color: '#45608a', shade: '#344a6c' },
];

export const HAIR_STYLES = [
  { id: 'short', name: 'Short' },
  { id: 'buzz', name: 'Buzz cut' },
  { id: 'afro', name: 'Afro' },
  { id: 'locs', name: 'Locs' },
  { id: 'cap', name: 'Cap' },
] as const;

export const TOP_STYLES = [
  { id: 'hoodie', name: 'Hoodie' },
  { id: 'tee', name: 'T-shirt' },
] as const;

export type HairStyleId = (typeof HAIR_STYLES)[number]['id'];
export type TopStyleId = (typeof TOP_STYLES)[number]['id'];

export interface LookChoice {
  skin: string;
  hairStyle: HairStyleId;
  hairColor: string;
  top: TopStyleId;
  topColor: string;
  pantsColor: string;
}

export const DEFAULT_LOOK_CHOICE: LookChoice = {
  skin: 'tone5',
  hairStyle: 'short',
  hairColor: 'black',
  top: 'hoodie',
  topColor: 'red',
  pantsColor: 'navy',
};

export const swatch = (list: Swatch[], id: string): Swatch => list.find((s) => s.id === id) ?? list[0]!;
