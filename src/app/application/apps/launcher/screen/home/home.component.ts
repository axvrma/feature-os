import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ROUTE_LAUNCHER } from '../../constant';
import { ActionBarModel, EventService, SubscriptionService, Keypad } from '../../../../sdk';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [SubscriptionService]
})
export class HomeComponent implements OnInit {

  actionBar: ActionBarModel = {
    left: {
      icon: 'menu',
    },
    center: {
      text: 'Menu',
    },
    right: {
      icon: 'menu',
    }
  }

  constructor (
    private subs: SubscriptionService,
    private eventService: EventService,
    private router: Router
  ) {
    this.listenKeypad();
  }

  ngOnInit() {
    this.listenKeypad();
  }

  listenKeypad() {
    this.subs.add(
      this.eventService.getEvent().subscribe((res: any) => {
        this.onKeyAction(res);
      }));
  }

  onKeyAction(action: Keypad) {
    switch (action) {
      case Keypad.D_PAD_CENTER: {
        this.router.navigateByUrl(ROUTE_LAUNCHER.DRAWER);
        break;
      }
      case Keypad.ACTION_LEFT: {
        console.log(action);
        break;
      }
      case Keypad.ACTION_RIGHT: {
        console.log(action);
        break;
      }
      case Keypad.CALL: {
        this.router.navigateByUrl(ROUTE_LAUNCHER.CALL);
        break;
      }
    }
  }

}
