import { KeypadService } from './keypad.service';

describe('KeypadService', () => {
  let service: KeypadService;

  beforeEach(() => {
    service = new KeypadService();
  });

  it('maps keyboard navigation to feature-phone keys', () => {
    expect(service.mapKeyboard(new KeyboardEvent('keydown', { key: 'ArrowUp' }))).toBe('up');
    expect(service.mapKeyboard(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe('center');
    expect(service.mapKeyboard(new KeyboardEvent('keydown', { key: 'Escape' }))).toBe('end');
  });

  it('maps soft, call, home, and numeric keys', () => {
    expect(service.mapKeyboard(new KeyboardEvent('keydown', { key: 'q' }))).toBe('soft-left');
    expect(service.mapKeyboard(new KeyboardEvent('keydown', { key: 'e' }))).toBe('soft-right');
    expect(service.mapKeyboard(new KeyboardEvent('keydown', { key: 'c' }))).toBe('call');
    expect(service.mapKeyboard(new KeyboardEvent('keydown', { key: 'h' }))).toBe('end');
    expect(service.mapKeyboard(new KeyboardEvent('keydown', { key: '7' }))).toBe('7');
  });
});
