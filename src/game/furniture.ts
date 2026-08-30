export interface FurnitureType {
  id: string;
  name: string;
  emoji: string;
  width: number;
  height: number;
  color: number;
  category: 'seating' | 'sleeping' | 'storage' | 'decor' | 'lighting';
}

export interface FurnitureInstance {
  id: string;
  house_id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  props: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export const FURNITURE_CATALOG: FurnitureType[] = [
  // Sleeping
  { id: 'bed', name: 'Bed', emoji: '🛏️', width: 64, height: 96, color: 0xffb3c1, category: 'sleeping' },
  { id: 'small_bed', name: 'Small Bed', emoji: '🛌', width: 48, height: 80, color: 0xffc8dd, category: 'sleeping' },

  // Seating
  { id: 'sofa', name: 'Sofa', emoji: '🛋️', width: 80, height: 40, color: 0xb19cd9, category: 'seating' },
  { id: 'chair', name: 'Chair', emoji: '🪑', width: 32, height: 32, color: 0xc9a96e, category: 'seating' },
  { id: 'armchair', name: 'Armchair', emoji: '💺', width: 40, height: 40, color: 0xd4a5a5, category: 'seating' },

  // Tables
  { id: 'table', name: 'Table', emoji: '🪵', width: 64, height: 48, color: 0xa0785a, category: 'storage' },
  { id: 'dining_table', name: 'Dining Table', emoji: '🍽️', width: 80, height: 56, color: 0x8b6f47, category: 'storage' },
  { id: 'desk', name: 'Desk', emoji: '🖥️', width: 64, height: 40, color: 0x9c7c54, category: 'storage' },

  // Storage
  { id: 'tv', name: 'TV', emoji: '📺', width: 56, height: 16, color: 0x333333, category: 'storage' },
  { id: 'bookshelf', name: 'Bookshelf', emoji: '📚', width: 48, height: 24, color: 0x6b4423, category: 'storage' },

  // Decor
  { id: 'plant', name: 'Plant', emoji: '🪴', width: 24, height: 24, color: 0x6b8e4e, category: 'decor' },
  { id: 'rug', name: 'Rug', emoji: '🟫', width: 72, height: 48, color: 0xe8b4a0, category: 'decor' },
  { id: 'picture', name: 'Picture', emoji: '🖼️', width: 32, height: 8, color: 0x8b6f47, category: 'decor' },
  { id: 'teddy', name: 'Teddy', emoji: '🧸', width: 20, height: 20, color: 0xc9a96e, category: 'decor' },

  // Lighting
  { id: 'lamp', name: 'Lamp', emoji: '💡', width: 20, height: 20, color: 0xf4d35e, category: 'lighting' },
  { id: 'candle', name: 'Candle', emoji: '🕯️', width: 12, height: 12, color: 0xfff4cc, category: 'lighting' },
];

export function getFurnitureType(id: string): FurnitureType | undefined {
  return FURNITURE_CATALOG.find((f) => f.id === id);
}