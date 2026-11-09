export interface Cell {
  x: number;
  y: number;
}
export type Direction = 'up' | 'down' | 'left' | 'right';
export class SnakeEngine {
  body: Cell[] = [
    { x: 4, y: 7 },
    { x: 3, y: 7 },
    { x: 2, y: 7 },
  ];
  direction: Direction = 'right';
  nextDirection: Direction = 'right';
  food: Cell = { x: 10, y: 7 };
  score = 0;
  over = false;
  won = false;
  private turned = false;
  constructor(
    readonly size = 16,
    private readonly random: () => number = Math.random,
  ) {}
  turn(direction: Direction): void {
    const opposite: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    };
    if (this.turned || direction === opposite[this.direction]) return;
    this.nextDirection = direction;
    this.turned = direction !== this.direction;
  }
  step(): void {
    if (this.over) return;
    this.direction = this.nextDirection;
    this.turned = false;
    const delta: Record<Direction, Cell> = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    const head = {
      x: this.body[0].x + delta[this.direction].x,
      y: this.body[0].y + delta[this.direction].y,
    };
    const eats = head.x === this.food.x && head.y === this.food.y;
    const occupied = eats ? this.body : this.body.slice(0, -1);
    if (
      head.x < 0 ||
      head.x >= this.size ||
      head.y < 0 ||
      head.y >= this.size ||
      occupied.some((cell) => cell.x === head.x && cell.y === head.y)
    ) {
      this.over = true;
      return;
    }
    this.body.unshift(head);
    if (eats) {
      this.score += 10;
      this.placeFood();
    } else this.body.pop();
  }
  placeFood(): void {
    const occupied = new Set(this.body.map((cell) => `${cell.x},${cell.y}`));
    const free: Cell[] = [];
    for (let y = 0; y < this.size; y++)
      for (let x = 0; x < this.size; x++) if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    if (!free.length) {
      this.over = true;
      this.won = true;
      return;
    }
    this.food =
      free[Math.min(free.length - 1, Math.max(0, Math.floor(this.random() * free.length)))];
  }
}
