import { Component, OnInit } from '@angular/core';
import { Keypad, KeypadListenerService } from 'src/app/application/hardware';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor (
    private keypadListener: KeypadListenerService
  ) { }

  ngOnInit() {
  }

  listenKeypad() {
    this.keypadListener.getAction().subscribe((res: any) => {
      console.log(res);
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
