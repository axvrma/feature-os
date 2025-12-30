import { Component, Input, OnInit } from '@angular/core';
import { KeypadAction } from '../../model';
import { Keypad } from '../../enum';

@Component({
  selector: 'app-little-list',
  templateUrl: './little-list.component.html',
  styleUrls: ['./little-list.component.scss']
})
export class LittleListComponent implements OnInit {

  @Input() data: any;
  @Input() currentRow: number = 0;
  @Input() keypadAction: KeypadAction;

  listKeypadAction: KeypadAction = {
    [Keypad.D_PAD_UP]: () => {
      if (this.currentRow === 0) {
        this.currentRow = this.data.length - 1;
      } else {
        this.currentRow--;
      }
      this.keypadAction[Keypad.D_PAD_UP] ? this.keypadAction[Keypad.D_PAD_UP]() : null;
    },
    [Keypad.D_PAD_DOWN]: () => {
      if (this.currentRow === this.data.length - 1) {
        this.currentRow = 0;
      } else {
        this.currentRow++;
      }
      this.keypadAction[Keypad.D_PAD_DOWN] ? this.keypadAction[Keypad.D_PAD_DOWN]() : null;
    }
  }

  constructor () { }

  ngOnInit() {
  }

}
