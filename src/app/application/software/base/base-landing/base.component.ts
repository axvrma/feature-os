import { Component, OnInit } from '@angular/core';
import { Keypad, KeypadListenerService } from 'src/app/application/hardware';
import { BaseRoute } from '../base.route';
import { Router } from '@angular/router';

@Component({
  selector: 'app-base',
  templateUrl: './base.component.html',
  styleUrls: ['./base.component.scss']
})
export class BaseComponent implements OnInit {

  constructor (
    private keypadListener: KeypadListenerService,
    private router: Router
  ) { }

  ngOnInit() {
  }

  listenKeypad() {
    this.keypadListener.init();
    this.keypadListener.getAction().subscribe((res: Keypad) => {
      this.keypadAction(res);
    });
  }

  keypadAction(action: Keypad) {
    switch (action) {
      case Keypad.CALL_DISCONNECT: {
        this.router.navigateByUrl(BaseRoute.HOME);
      }
    }
  }

}
