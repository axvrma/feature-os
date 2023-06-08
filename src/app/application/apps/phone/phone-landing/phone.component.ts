import { Component, OnInit } from '@angular/core';
import { ActionBarModel, Keypad, KeypadAction, SubscriptionService } from 'src/app/application/sdk';
import { ROUTE_LAUNCHER } from '../../launcher';
import { Router } from '@angular/router';

@Component({
  selector: 'app-phone',
  templateUrl: './phone.component.html',
  styleUrls: ['./phone.component.scss'],
  providers: [SubscriptionService],
})
export class PhoneComponent implements OnInit {

  appName = 'Phone';

  actions: ActionBarModel = {
    right: {
      icon: 'arrow_back'
    }
  }

  keypadAction: KeypadAction = {
    [Keypad.ACTION_RIGHT]: () => {
      this.router.navigateByUrl(ROUTE_LAUNCHER.DRAWER);
    }
  }

  constructor (
    private router: Router
  ) { }

  ngOnInit() {
  }

}
