import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  private event = new Subject();
  private event$ = this.event.asObservable();

  constructor () { }

  newEvent(data: any) {
    this.event.next(data);
  }

  getEvent() {
    return this.event$;
  }

}
