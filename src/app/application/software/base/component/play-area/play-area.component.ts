import { Component, OnInit } from '@angular/core';
import { Keypad, KeypadListenerService } from 'src/app/application/hardware';

@Component({
  selector: 'app-play-area',
  templateUrl: './play-area.component.html',
  styleUrls: ['./play-area.component.scss']
})
export class PlayAreaComponent implements OnInit {

  constructor (
    private keypadListener: KeypadListenerService
  ) { }

  ngOnInit() {
  }

  listenKeypad() {
    this.keypadListener.getAction().subscribe((res: any) => {
      this.onKeyAction(res);
    })
  }

  onKeyAction(action: Keypad) {
    switch (action) {
      case Keypad.CALL_DISCONNECT: {
        console.log('redirect to home');
        break;
      }
    }
  }

}
