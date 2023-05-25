import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DEFAULT_KEYPAD_ACTION } from '../constant';

@Injectable({
  providedIn: 'root'
})
export class ActionService {

  constructor (
    private route: Router
  ) { }

  goHome() {
    this.route.navigateByUrl(DEFAULT_KEYPAD_ACTION.DISCONNECT_BUTTON);
  }

}
