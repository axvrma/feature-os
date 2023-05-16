import { Component, OnInit } from '@angular/core';
import { KeypadListenerService } from '../../service';
import { Keypad } from '../../enum';

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
