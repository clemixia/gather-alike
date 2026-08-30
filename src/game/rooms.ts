export interface Room {
  id: string;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
}

// These match the walls in MainScene
export const ROOMS: Room[] = [
  { id: 'bedroom', name: '🛏️ Bedroom', bounds: { x: 0, y: 0, width: 300, height: 400 } },
  { id: 'kitchen', name: '🍳 Kitchen', bounds: { x: 300, y: 0, width: 500, height: 400 } },
  { id: 'living_room', name: '🛋️ Living Room', bounds: { x: 0, y: 400, width: 400, height: 200 } },
  { id: 'dining', name: '🍽️ Dining', bounds: { x: 400, y: 400, width: 400, height: 200 } },
];

export function getRoomAtPosition(x: number, y: number): Room | null {
  for (const room of ROOMS) {
    const { x: rx, y: ry, width, height } = room.bounds;
    if (x >= rx && x <= rx + width && y >= ry && y <= ry + height) {
      return room;
    }
  }
  return null;
}