import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class KeypadListenerService {

  private listener = new Subject<any>();
  private listener$ = this.listener.asObservable();

  constructor () { }

  newAction(intent: any) {
    this.listener.next(intent);
  }

  getAction() {
    return this.listener$;
  }

}
