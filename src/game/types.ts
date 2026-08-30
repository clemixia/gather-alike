export interface AvatarConfig {
  name: string;
  skin: 'light' | 'fair' | 'medium' | 'tan' | 'dark';
  hair: 'short' | 'long' | 'curly' | 'ponytail' | 'bald';
  hairColor: 'black' | 'brown' | 'blonde' | 'red' | 'gray' | 'pink';
  clothes: 'shirt' | 'hoodie' | 'dress';
  clothesColor: 'pink' | 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  accessory: 'none' | 'hat' | 'glasses' | 'bow' | 'flower';
}

export const DEFAULT_AVATAR: AvatarConfig = {
  name: 'Partner',
  skin: 'fair',
  hair: 'short',
  hairColor: 'brown',
  clothes: 'shirt',
  clothesColor: 'pink',
  accessory: 'none',
};

export const SKIN_COLORS: Record<AvatarConfig['skin'], number> = {
  light: 0xffdbac,
  fair: 0xf1c27d,
  medium: 0xe0ac69,
  tan: 0xc68642,
  dark: 0x8d5524,
};

export const HAIR_COLORS: Record<AvatarConfig['hairColor'], number> = {
  black: 0x2c1810,
  brown: 0x6b4423,
  blonde: 0xe8c88a,
  red: 0xb74a3a,
  gray: 0x9a9a9a,
  pink: 0xff8fab,
};

export const CLOTHES_COLORS: Record<AvatarConfig['clothesColor'], number> = {
  pink: 0xff8fab,
  blue: 0x7fb8d6,
  green: 0x8fbc8f,
  yellow: 0xf4d35e,
  purple: 0xb19cd9,
  red: 0xe57373,
};

export const SKIN_OPTIONS: AvatarConfig['skin'][] = ['light', 'fair', 'medium', 'tan', 'dark'];
export const HAIR_OPTIONS: AvatarConfig['hair'][] = ['short', 'long', 'curly', 'ponytail', 'bald'];
export const HAIR_COLOR_OPTIONS: AvatarConfig['hairColor'][] = ['black', 'brown', 'blonde', 'red', 'gray', 'pink'];
export const CLOTHES_OPTIONS: AvatarConfig['clothes'][] = ['shirt', 'hoodie', 'dress'];
export const CLOTHES_COLOR_OPTIONS: AvatarConfig['clothesColor'][] = ['pink', 'blue', 'green', 'yellow', 'purple', 'red'];
export const ACCESSORY_OPTIONS: AvatarConfig['accessory'][] = ['none', 'hat', 'glasses', 'bow', 'flower'];