import { Component, OnDestroy, OnInit } from '@angular/core';
import { Keypad, KeypadListenerService } from 'src/app/application/hardware';

@Component({
  selector: 'app-launcher',
  templateUrl: './launcher.component.html',
  styleUrls: ['./launcher.component.scss']
})
export class LauncherComponent implements OnInit, OnDestroy {

  constructor (
    private keypadListener: KeypadListenerService
  ) { }

  ngOnInit() {
    this.listenKeypad();
  }

  ngOnDestroy(): void {
    this.keypadListener.destroy();
  }

  listenKeypad() {
    this.keypadListener.init();
    this.keypadListener.getAction().subscribe((res: any) => {
      this.onKeyAction(res);
    })
  }

  onKeyAction(action: Keypad) {
    switch (action) {
      case Keypad.D_PAD_CENTER: {
        // if (!this.isAppDrawerOpen()) {
        //   this.appDrawer = true;
        // }
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
      case Keypad.CALL_DISCONNECT: {
        // if (this.isAppDrawerOpen()) {
        //   this.appDrawer = false;
        // }
        break;
      }
    }
  }
}
