import { SnakeEngine } from './snake-engine';
describe('Snake engine', () => {
  it('moves once, prevents reversal and prevents multiple turns per tick', () => {
    const game = new SnakeEngine();
    game.turn('left');
    expect(game.nextDirection).toBe('right');
    game.turn('up');
    game.turn('left');
    expect(game.nextDirection).toBe('up');
    game.step();
    expect(game.body[0]).toEqual({ x: 4, y: 6 });
    expect(game.body.length).toBe(3);
  });
  it('eats and always places food outside the body', () => {
    const game = new SnakeEngine(16, () => 0);
    game.food = { x: 5, y: 7 };
    game.step();
    expect(game.score).toBe(10);
    expect(game.body.length).toBe(4);
    expect(game.body.some((cell) => cell.x === game.food.x && cell.y === game.food.y)).toBeFalse();
  });
  it('detects walls and allows moving into a vacated tail cell', () => {
    const game = new SnakeEngine();
    game.body = [
      { x: 15, y: 1 },
      { x: 14, y: 1 },
    ];
    game.step();
    expect(game.over).toBeTrue();
    const tail = new SnakeEngine();
    tail.body = [
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
      { x: 0, y: 1 },
    ];
    tail.direction = 'up';
    tail.nextDirection = 'left';
    tail.step();
    expect(tail.over).toBeFalse();
  });
  it('ends a full board without an infinite food-generation loop', () => {
    const game = new SnakeEngine(2);
    game.body = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];
    game.placeFood();
    expect(game.won).toBeTrue();
    expect(game.over).toBeTrue();
  });
});
