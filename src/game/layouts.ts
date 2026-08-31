import type { Room } from './rooms';

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HouseLayout {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  floorColor: number;
  wallColor: number;
  spawn: {
    x: number;
    y: number;
  };
  walls: Wall[];
  rooms: Room[];
}

export const HOUSE_LAYOUTS: HouseLayout[] = [
  {
    id: 'cozy-house',
    name: 'Cozy House',
    description: 'A warm little home with a bedroom, kitchen, living room, and dining area.',
    width: 800,
    height: 600,
    floorColor: 0xf5e6d3,
    wallColor: 0x8b7355,
    spawn: { x: 400, y: 300 },
    walls: [
      { x: 400, y: 50, w: 800, h: 20 },
      { x: 400, y: 550, w: 800, h: 20 },
      { x: 50, y: 300, w: 20, h: 600 },
      { x: 750, y: 300, w: 20, h: 600 },
      { x: 300, y: 200, w: 20, h: 200 },
      { x: 500, y: 400, w: 200, h: 20 },
    ],
    rooms: [
      {
        id: 'bedroom',
        name: '🛏️ Bedroom',
        emoji: '🛏️',
        bounds: { x: 0, y: 0, width: 300, height: 400 },
      },
      {
        id: 'kitchen',
        name: '🍳 Kitchen',
        emoji: '🍳',
        bounds: { x: 300, y: 0, width: 500, height: 400 },
      },
      {
        id: 'living_room',
        name: '🛋️ Living Room',
        emoji: '🛋️',
        bounds: { x: 0, y: 400, width: 400, height: 200 },
      },
      {
        id: 'dining',
        name: '🍽️ Dining',
        emoji: '🍽️',
        bounds: { x: 400, y: 400, width: 400, height: 200 },
      },
    ],
  },

  {
    id: 'modern-house',
    name: 'Modern House',
    description: 'A larger open home with separated bedrooms and a big shared lounge.',
    width: 960,
    height: 640,
    floorColor: 0xf7ede2,
    wallColor: 0x7d6b5d,
    spawn: { x: 480, y: 420 },
    walls: [
      { x: 480, y: 50, w: 960, h: 20 },
      { x: 480, y: 590, w: 960, h: 20 },
      { x: 50, y: 320, w: 20, h: 640 },
      { x: 910, y: 320, w: 20, h: 640 },

      { x: 280, y: 175, w: 20, h: 250 },
      { x: 680, y: 175, w: 20, h: 250 },

      { x: 165, y: 300, w: 230, h: 20 },
      { x: 795, y: 300, w: 230, h: 20 },

      { x: 760, y: 470, w: 20, h: 340 },
      { x: 860, y: 440, w: 200, h: 20 },
    ],
    rooms: [
      {
        id: 'bedroom_1',
        name: '🛏️ Bedroom 1',
        emoji: '🛏️',
        bounds: { x: 0, y: 0, width: 280, height: 300 },
      },
      {
        id: 'kitchen',
        name: '🍳 Kitchen',
        emoji: '🍳',
        bounds: { x: 280, y: 0, width: 400, height: 300 },
      },
      {
        id: 'bedroom_2',
        name: '🛏️ Bedroom 2',
        emoji: '🛏️',
        bounds: { x: 680, y: 0, width: 280, height: 300 },
      },
      {
        id: 'lounge',
        name: '🛋️ Lounge',
        emoji: '🛋️',
        bounds: { x: 0, y: 300, width: 760, height: 340 },
      },
      {
        id: 'hallway',
        name: '🚪 Hallway',
        emoji: '🚪',
        bounds: { x: 760, y: 300, width: 200, height: 140 },
      },
      {
        id: 'bathroom',
        name: '🚿 Bathroom',
        emoji: '🚿',
        bounds: { x: 760, y: 440, width: 200, height: 200 },
      },
    ],
  },

  {
    id: 'small-house',
    name: 'Small House',
    description: 'A tiny cute home with a bed corner, kitchen corner, and shared living area.',
    width: 640,
    height: 480,
    floorColor: 0xfdf6ec,
    wallColor: 0x9c7c54,
    spawn: { x: 320, y: 300 },
    walls: [
      { x: 320, y: 40, w: 640, h: 20 },
      { x: 320, y: 440, w: 640, h: 20 },
      { x: 40, y: 240, w: 20, h: 480 },
      { x: 600, y: 240, w: 20, h: 480 },
      { x: 220, y: 140, w: 20, h: 200 },
    ],
    rooms: [
      {
        id: 'bed_corner',
        name: '🛏️ Bed Corner',
        emoji: '🛏️',
        bounds: { x: 0, y: 0, width: 220, height: 240 },
      },
      {
        id: 'kitchen_corner',
        name: '🍳 Kitchen Corner',
        emoji: '🍳',
        bounds: { x: 220, y: 0, width: 420, height: 240 },
      },
      {
        id: 'living_area',
        name: '🛋️ Living Area',
        emoji: '🛋️',
        bounds: { x: 0, y: 240, width: 640, height: 240 },
      },
    ],
  },
];

export function getHouseLayout(id?: string | null): HouseLayout {
  return HOUSE_LAYOUTS.find((layout) => layout.id === id) ?? HOUSE_LAYOUTS[0];
}