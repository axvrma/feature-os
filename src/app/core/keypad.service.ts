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
    const keyMap: Record<string, KeypadKey> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      Enter: 'center',
      Escape: 'end',
      Backspace: 'back',
      '*': 'star',
      '#': 'hash',
      q: 'soft-left',
      e: 'soft-right',
      c: 'call',
      h: 'end',
      '0': '0',
      '1': '1',
      '2': '2',
      '3': '3',
      '4': '4',
      '5': '5',
      '6': '6',
      '7': '7',
      '8': '8',
      '9': '9',
    };

    return keyMap[event.key] ?? keyMap[event.key.toLowerCase()] ?? null;
  }
}
