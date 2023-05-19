import { Component, OnInit } from '@angular/core';
import { CONFIGURATION } from 'src/app/application/config';
import { Keypad, KeypadListenerService } from 'src/app/application/hardware';
import { DrawerModel } from './drawer.model';

@Component({
  selector: 'app-drawer',
  templateUrl: './drawer.component.html',
  styleUrls: ['./drawer.component.scss']
})
export class DrawerComponent implements OnInit {

  drawer: DrawerModel[] = CONFIGURATION.drawer;

  constructor (
    private keypadListener: KeypadListenerService
  ) { }

  ngOnInit() {
    this.listenKeypad();
  }

  listenKeypad() {
    this.keypadListener.getAction().subscribe((res: any) => {
      this.onKeyAction(res);
    });
  }

  onKeyAction(action: Keypad) {
    console.log(action);
    switch (action) {
      case Keypad.D_PAD_CENTER: {
        break;
      }
      case Keypad.D_PAD_UP: {
        const index = this.drawer.findIndex(app => app.active)
        const newIndex = index > -1 && index > 2 ? index - 3 : index;
        this.drawer[index].active = false;
        this.drawer[newIndex].active = true;
        break;
      }
      case Keypad.D_PAD_DOWN: {
        const index = this.drawer.findIndex(app => app.active)
        const newIndex = index > -1 && index < this.drawer.length - 3 ? index + 3 : index;
        this.drawer[index].active = false;
        this.drawer[newIndex].active = true;
        break;
      }
      case Keypad.D_PAD_LEFT: {
        const index = this.drawer.findIndex(app => app.active)
        const newIndex = index > -1 && index > 0 ? index - 1 : index;
        this.drawer[index].active = false;
        this.drawer[newIndex].active = true;
        break;
      }
      case Keypad.D_PAD_RIGHT: {
        const index = this.drawer.findIndex(app => app.active)
        const newIndex = index > -1 && index < this.drawer.length - 1 ? index + 1 : index;
        this.drawer[index].active = false;
        this.drawer[newIndex].active = true;
        break;
      }
    }
  }
}
