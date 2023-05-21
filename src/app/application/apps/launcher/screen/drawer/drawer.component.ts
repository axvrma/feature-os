import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DrawerModel } from '../../model/drawer.model';
import { EventService, SubscriptionService, Keypad, ActionBarModel } from '../../../../sdk';
import { ROUTE_LAUNCHER } from '../../constant';
import { LauncherService } from '../../service';

@Component({
  selector: 'app-drawer',
  templateUrl: './drawer.component.html',
  styleUrls: ['./drawer.component.scss'],
  providers: [SubscriptionService]
})
export class DrawerComponent implements OnInit {

  appList: DrawerModel[];
  baseRoute = '/app';

  actionBar: ActionBarModel = {
    left: {
      icon: 'menu',
    },
    center: {
      text: 'Select',
    },
    right: {
      icon: 'arrow_back',
    }
  }

  constructor (
    private eventService: EventService,
    private subs: SubscriptionService,
    private launcherService: LauncherService,
    private router: Router
  ) { }

  ngOnInit() {
    this.prepareAppList();
    this.listenKeypad();
  }

  prepareAppList() {
    this.appList = this.launcherService.getList();
    if (!this.appList) {
      this.subs.add(
        this.launcherService.getListListener().subscribe(list => {
          this.appList = list as DrawerModel[];
          this.processAppList();
        }));
    } else {
      this.processAppList();
    }
  }

  processAppList() {
    this.appList.forEach((app: DrawerModel, index: number) => app.active = !!(index === 4));
  }

  listenKeypad() {
    this.subs.add(
      this.eventService.getEvent().subscribe((res: any) => {
        this.onKeyAction(res);
      })
    );
  }

  onKeyAction(action: Keypad) {
    switch (action) {
      case Keypad.D_PAD_CENTER: {
        const index = this.appList.findIndex(app => app.active);
        this.router.navigateByUrl(this.baseRoute + this.appList[index].route);
        break;
      }
      case Keypad.D_PAD_UP: {
        const index = this.appList.findIndex(app => app.active)
        const newIndex = index > -1 && index > 2 ? index - 3 : index;
        this.appList[index].active = false;
        this.appList[newIndex].active = true;
        break;
      }
      case Keypad.D_PAD_DOWN: {
        const index = this.appList.findIndex(app => app.active)
        const newIndex = index > -1 && index < this.appList.length - 3 ? index + 3 : index;
        this.appList[index].active = false;
        this.appList[newIndex].active = true;
        break;
      }
      case Keypad.D_PAD_LEFT: {
        const index = this.appList.findIndex(app => app.active)
        const newIndex = index > -1 && index > 0 ? index - 1 : index;
        this.appList[index].active = false;
        this.appList[newIndex].active = true;
        break;
      }
      case Keypad.D_PAD_RIGHT: {
        const index = this.appList.findIndex(app => app.active)
        const newIndex = index > -1 && index < this.appList.length - 1 ? index + 1 : index;
        this.appList[index].active = false;
        this.appList[newIndex].active = true;
        break;
      }
      case Keypad.ACTION_LEFT: {
        break;
      }
      case Keypad.ACTION_RIGHT: {
        this.router.navigateByUrl(ROUTE_LAUNCHER.HOME);
        break;
      }
    }
  }
}
