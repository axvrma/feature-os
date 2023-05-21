import { Component, OnInit } from '@angular/core';
import { BaseRoute } from '../constant';
import { Router } from '@angular/router';
import { EventService, SubscriptionService, KeypadListenerService, Keypad } from '../../sdk';

@Component({
  selector: 'app-base',
  templateUrl: './base.component.html',
  styleUrls: ['./base.component.scss'],
  providers: [SubscriptionService]
})
export class BaseComponent implements OnInit {

  constructor (
    private keypadListener: KeypadListenerService,
    private eventService: EventService,
    private subs: SubscriptionService,
    private router: Router
  ) { }

  ngOnInit() {
    this.listenKeypad();
  }

  listenKeypad() {
    this.subs.add(
      this.keypadListener.getAction().subscribe((res: Keypad) => {
        this.keypadAction(res);
      }));
  }

  keypadAction(action: Keypad) {
    switch (action) {
      case Keypad.CALL_DISCONNECT: {
        this.router.navigateByUrl(BaseRoute.HOME);
        break;
      }
      default: {
        this.eventService.newEvent(action);
      }
    }
  }

}
