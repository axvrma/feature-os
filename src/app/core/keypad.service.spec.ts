import { KeypadService } from './keypad.service';
import { MultiTapEditor, toT9 } from './input/multi-tap';
describe('KeypadService', () => {
  const keypad = new KeypadService();
  it('maps navigation, shortcuts and numbers', () => {
    for (const [key, expected] of [
      ['ArrowUp', 'up'],
      ['Enter', 'center'],
      ['Escape', 'end'],
      ['q', 'soft-left'],
      ['F2', 'soft-right'],
      ['c', 'call'],
      ['7', '7'],
      ['*', 'star'],
    ] as const)
      expect(keypad.mapKeyboard(new KeyboardEvent('keydown', { key }))).toBe(expected);
  });
  it('keeps native text, arrow, backspace and modified shortcuts intact', () => {
    const input = document.createElement('input');
    const mapped: Array<string | null> = [];
    input.addEventListener('keydown', (e) => mapped.push(keypad.mapKeyboard(e)));
    for (const key of ['q', '2', 'Backspace', 'ArrowLeft'])
      input.dispatchEvent(new KeyboardEvent('keydown', { key }));
    expect(mapped).toEqual([null, null, null, null]);
    expect(
      keypad.mapKeyboard(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true })),
    ).toBeNull();
  });
  it('dispatches a physical key once', () => {
    let value = '';
    const sub = keypad.keys$.subscribe((key) => (value = key));
    keypad.press('hash');
    expect(value).toBe('hash');
    sub.unsubscribe();
  });
});
describe('Multi-tap editing', () => {
  it('deletes complete emoji and combining characters', () => {
    const e = new MultiTapEditor();
    expect(e.apply('a🙂', 3, 3, 'back').value).toBe('a');
    expect(e.apply('café', 5, 5, 'back').value).toBe('caf');
  });
  it('cycles, times out and preserves the cursor and selected text', () => {
    const e = new MultiTapEditor();
    const a = e.apply('', 0, 0, '2', 100);
    expect(a).toEqual({ value: 'a', cursor: 1 });
    expect(e.apply('a', 1, 1, '2', 200)).toEqual({ value: 'b', cursor: 1 });
    expect(e.apply('b', 1, 1, '2', 1200)).toEqual({ value: 'ba', cursor: 2 });
    e.reset();
    expect(e.apply('hello', 1, 4, '9', 1300)).toEqual({ value: 'hwo', cursor: 2 });
  });
  it('supports case, punctuation, deletion and numeric mode separately', () => {
    const e = new MultiTapEditor();
    e.apply('', 0, 0, 'hash', 1);
    expect(e.apply('', 0, 0, '2', 2).value).toBe('A');
    expect(e.apply('ab', 2, 2, 'back', 3).value).toBe('a');
    expect(e.apply('abc', 1, 3, 'back', 4)).toEqual({ value: 'a', cursor: 1 });
    expect(e.apply('', 0, 0, '1', 5).value).toBe('.');
    expect(e.apply('12', 2, 2, '2', 6, true).value).toBe('122');
    expect(toT9('Asha')).toBe('2742');
  });
  it('does not replace a character after cursor movement or normal text changes', () => {
    const e = new MultiTapEditor();
    e.apply('', 0, 0, '2', 0);
    expect(e.apply('a', 0, 0, '2', 1).value).toBe('aa');
    expect(e.apply('ab', 2, 2, '2', 2).value).toBe('aba');
  });
});
