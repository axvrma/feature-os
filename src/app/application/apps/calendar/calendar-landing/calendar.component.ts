import { Component, OnInit } from '@angular/core';
import { ActionBarModel, Keypad, KeypadAction } from 'src/app/application/sdk';
import { ROUTE_LAUNCHER } from '../../launcher';
import { Router } from '@angular/router';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {

  appName = 'Calendar';

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
