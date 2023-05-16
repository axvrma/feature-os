import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Keypad } from '../enum';

@Injectable({
  providedIn: 'root'
})
export class KeypadListenerService {

  listener: any;

  constructor () { }

  init() {
    this.listener = new BehaviorSubject(null);
  }

  newAction(intent: any) {
    this.listener.next(intent)
  }

  getAction() {
    return this.listener;
  }

  destroy() {
    this.listener.unsubscribe();
  }

}
