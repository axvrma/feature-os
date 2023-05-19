import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Keypad } from '../../hardware/enum';

@Injectable({
  providedIn: 'root'
})
export class KeypadListenerService {

  listener = new Subject<any>();
  listener$ = this.listener.asObservable();

  constructor () { }

  newAction(intent: any) {
    this.listener.next(intent);
  }

  getAction() {
    return this.listener$;
  }

}
