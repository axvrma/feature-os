import { Component, OnInit } from '@angular/core';
import { KeypadListenerService, Keypad } from '../../../sdk';

@Component({
  selector: 'app-keypad',
  templateUrl: './keypad.component.html',
  styleUrls: ['./keypad.component.scss']
})
export class KeypadComponent implements OnInit {

  keyPad = Keypad;

  constructor (
    private keypadListener: KeypadListenerService
  ) { }

  ngOnInit() {
  }

  keyAction(action: Keypad) {
    this.keypadListener.newAction(action);
  }
}
