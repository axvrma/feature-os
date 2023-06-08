import { Component, Input, OnInit } from '@angular/core';
import { ActionBarModel, KeypadAction } from '../../model';
import { EventService, SubscriptionService } from '../../service';
import { Keypad } from '../../enum';

@Component({
  selector: 'app-scaffold',
  templateUrl: './scaffold.component.html',
  styleUrls: ['./scaffold.component.scss'],
  providers: [SubscriptionService]
})
export class ScaffoldComponent implements OnInit {

  @Input() appName: string;
  @Input() actions: ActionBarModel;
  @Input() keyPadAction: KeypadAction;

  constructor (
    private subs: SubscriptionService,
    private eventService: EventService
  ) { }

  ngOnInit() {
    this.keypadListener();
  }

  keypadListener() {
    this.subs.add(
      this.eventService.getEvent().subscribe((res: any) => {
        switch (res) {
          case Keypad.ACTION_LEFT: {
            this.safeExecute(this.keyPadAction?.[Keypad.ACTION_LEFT]);
            break;
          }
          case Keypad.ACTION_RIGHT: {
            this.safeExecute(this.keyPadAction?.[Keypad.ACTION_RIGHT]);
            break;
          }
          case Keypad.D_PAD_UP: {
            this.safeExecute(this.keyPadAction?.[Keypad.D_PAD_UP]);
            break;
          }
          case Keypad.D_PAD_DOWN: {
            this.safeExecute(this.keyPadAction?.[Keypad.D_PAD_DOWN]);
            break;
          }
          case Keypad.D_PAD_CENTER: {
            this.safeExecute(this.keyPadAction?.[Keypad.D_PAD_CENTER]);
            break;
          }
          case Keypad.D_PAD_RIGHT: {
            this.safeExecute(this.keyPadAction?.[Keypad.D_PAD_RIGHT]);
            break;
          }
          case Keypad.D_PAD_LEFT: {
            this.safeExecute(this.keyPadAction?.[Keypad.D_PAD_LEFT]);
            break;
          }
        }
      })
    );
  }

  safeExecute(func: any) {
    func ? func() : null;
  }

}
