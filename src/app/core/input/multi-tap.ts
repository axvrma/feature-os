import { KeypadKey } from '../os-models';
export interface TextEdit {
  value: string;
  cursor: number;
}
const GROUPS: Partial<Record<KeypadKey, string>> = {
  '0': ' 0',
  '1': '. ,?!1',
  '2': 'abc2',
  '3': 'def3',
  '4': 'ghi4',
  '5': 'jkl5',
  '6': 'mno6',
  '7': 'pqrs7',
  '8': 'tuv8',
  '9': 'wxyz9',
  star: '+*-/@:;()',
};
export class MultiTapEditor {
  upper = false;
  private last?: { key: KeypadKey; at: number; cursor: number; value: string; cycle: number };
  reset(): void {
    this.last = undefined;
  }
  apply(
    value: string,
    start: number,
    end: number,
    key: KeypadKey,
    now = Date.now(),
    numeric = false,
  ): TextEdit {
    if (key === 'hash' && !numeric) {
      this.upper = !this.upper;
      this.reset();
      return { value, cursor: start };
    }
    if (key === 'back') {
      this.reset();
      const previous = start === end ? previousGrapheme(value, start) : start;
      return { value: value.slice(0, previous) + value.slice(end), cursor: previous };
    }
    const chars = numeric
      ? key === 'star'
        ? '*'
        : key === 'hash'
          ? '#'
          : /^\d$/.test(key)
            ? key
            : ''
      : (GROUPS[key] ?? '');
    if (!chars) return { value, cursor: start };
    const cycle =
      !numeric &&
      this.last?.key === key &&
      now - this.last.at < 900 &&
      this.last.cursor === start &&
      this.last.value === value &&
      start === end;
    const index = cycle ? (this.last!.cycle + 1) % chars.length : 0;
    const from = cycle ? start - 1 : start;
    const char = this.upper ? chars[index].toUpperCase() : chars[index];
    const result = { value: value.slice(0, from) + char + value.slice(end), cursor: from + 1 };
    this.last = { key, at: now, cursor: result.cursor, value: result.value, cycle: index };
    return result;
  }
}
export function toT9(text: string): string {
  return text
    .toLowerCase()
    .replace(/[a-z]/g, (c) =>
      String(
        ['abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'].findIndex((group) =>
          group.includes(c),
        ) + 2,
      ),
    );
}

export function previousGrapheme(value: string, cursor: number): number {
  if (typeof Intl.Segmenter === 'function')
    return (
      Array.from(
        new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value.slice(0, cursor)),
      ).at(-1)?.index ?? 0
    );
  return Math.max(0, cursor - (Array.from(value.slice(0, cursor)).at(-1)?.length ?? 1));
}
