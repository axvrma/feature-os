import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { KeypadKey } from './os-models';
@Injectable({ providedIn: 'root' })
export class KeypadService {
  private readonly keys = new Subject<KeypadKey>();
  readonly keys$ = this.keys.asObservable();
  press(key: KeypadKey): void {
    this.keys.next(key);
  }
  mapKeyboard(event: KeyboardEvent): KeypadKey | null {
    if (event.ctrlKey || event.altKey || event.metaKey) return null;
    const element = event.target;
    if (
      element instanceof HTMLElement &&
      (element.matches('textarea,select') ||
        element.isContentEditable ||
        (element instanceof HTMLInputElement &&
          !['checkbox', 'radio', 'file', 'button', 'submit', 'reset'].includes(element.type))) &&
      !['Escape', 'F1', 'F2'].includes(event.key)
    )
      return null;
    const map: Record<string, KeypadKey> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      Enter: 'center',
      Escape: 'end',
      Backspace: 'back',
      F1: 'soft-left',
      F2: 'soft-right',
      q: 'soft-left',
      e: 'soft-right',
      c: 'call',
      h: 'end',
      '*': 'star',
      '#': 'hash',
    };
    if (/^\d$/.test(event.key)) return event.key as KeypadKey;
    return map[event.key] ?? map[event.key.toLowerCase()] ?? null;
  }
}
