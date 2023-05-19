import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  private event = new Subject();
  private event$ = this.event.asObservable();

  constructor () { }

  getEvent() {
    return this.event$;
  }

  newEvent(data: any) {
    this.event.next(data);
  }

}
