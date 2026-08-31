export interface Room {
  id: string;
  name: string;
  emoji?: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export function getRoomAtPosition(
  x: number,
  y: number,
  rooms: Room[] = []
): Room | null {
  for (const room of rooms) {
    const { x: rx, y: ry, width, height } = room.bounds;

    if (x >= rx && x <= rx + width && y >= ry && y <= ry + height) {
      return room;
    }
  }

  return null;
}