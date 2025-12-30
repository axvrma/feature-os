import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActionBarModel, Keypad, KeypadAction, SubscriptionService } from 'src/app/application/sdk';
import { ROUTE_LAUNCHER } from '../../../launcher';
import { AlarmsService } from '../../service';

@Component({
  selector: 'app-alarms',
  templateUrl: './alarms.component.html',
  styleUrls: ['./alarms.component.scss']
})
export class AlarmsComponent implements OnInit {

  appName = 'Alarms';
  alarmsData: any;
  depth: number[] = [];

  actions: ActionBarModel = {
    left: {
      icon: 'menu',

    },
    right: {
      icon: 'arrow_back'
    }
  }

  keypadAction: KeypadAction = {
    [Keypad.ACTION_LEFT]: () => {
      this.router.navigateByUrl(ROUTE_LAUNCHER.DRAWER);
    },
    [Keypad.ACTION_RIGHT]: () => {
      this.router.navigateByUrl(ROUTE_LAUNCHER.DRAWER);
    }
  }

  constructor (
    private subs: SubscriptionService,
    private alarmsService: AlarmsService,
    private router: Router
  ) { }

  ngOnInit() {
    this.getAlarmsJSON();
  }

  getAlarmsJSON() {
    this.subs.add(
      this.alarmsService.loadAlarms().subscribe((res: any) => {
        this.alarmsData = res.data;
        this.depth = [0];
      })
    );
  }

}
