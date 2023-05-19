import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Keypad } from 'src/app/application/hardware';
import { EventService, SubscriptionService } from 'src/app/application/software/base';
import { ROUTE_LAUNCHER } from '../../constant';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor (
    private eventService: EventService,
    private subs: SubscriptionService,
    private router: Router
  ) { }

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
    }
  }

}
