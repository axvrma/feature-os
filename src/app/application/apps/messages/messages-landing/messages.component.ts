import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActionBarModel, EventService, Keypad, SubscriptionService } from 'src/app/application/sdk';
import { MessagesService } from '../service';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss'],
  providers: [SubscriptionService],
})
export class MessagesComponent implements OnInit {

  messagesData: any;
  depth: number[] = [];

  actions: ActionBarModel = {
    left: {
      icon: 'settings'
    },
    center: {
      text: 'Select'
    },
    right: {
      icon: 'arrow_back'
    }
  }

  constructor (
    private subs: SubscriptionService,
    private messagesService: MessagesService,
    private eventService: EventService,
    private router: Router,
  ) { }

  ngOnInit() {
    this.getMessagesJSON();
    this.keypadListener();
  }

  getMessagesJSON() {
    this.subs.add(
      this.messagesService.loadMessages().subscribe((res: any) => {
        this.messagesData = res.data;
        this.depth = [0];
      })
    );
  }

  keypadListener() {
    // TODO: fix this
    this.subs.add(
      this.eventService.getEvent().subscribe((res: any) => {
        switch (res) {
          case Keypad.D_PAD_CENTER: {
            // this.currentSettingsList = (this.currentSettingsList.children as any[])[this.getLastDepth()];
            // this.addNewDepth();
            break;
          }
          case Keypad.ACTION_LEFT: {
            break;
          }
          case Keypad.ACTION_RIGHT: {
            if (this.depth.length > 1) {
              // this.deleteOneDepth();
              // this.currentSettingsList = this.getSettingsFromDepth();
            } else {
              this.router.navigateByUrl('/app/launcher/drawer');
            }
            break;
          }
          case Keypad.D_PAD_UP: {
            // if (this.getLastDepth() === 0) {
            //   this.setLastDepth((this.currentSettingsList.children as any[])?.length - 1);
            // } else {
            //   this.setLastDepth(this.getLastDepth() - 1);
            // }
            document.getElementById('' + this.getLastDepth())?.scrollIntoView({ behavior: "smooth", block: "start" });
            break;
          }
          case Keypad.D_PAD_DOWN: {
            // if (this.getLastDepth() === (this.currentSettingsList.children as any[]).length - 1) {
            //   this.setLastDepth(0);
            // } else {
            //   this.setLastDepth(this.getLastDepth() + 1);
            // }
            document.getElementById('' + this.getLastDepth())?.scrollIntoView({ behavior: "smooth", block: "start" });
            break;
          }
        }
      })
    );
  }

  getLastDepth() {
    return this.depth[this.depth.length - 1];
  }

  setLastDepth(item: number) {
    this.depth[this.depth.length - 1] = item;
  }

  addNewDepth() {
    this.depth.push(0);
  }

  deleteOneDepth() {
    this.depth.pop();
  }

  getSettingsFromDepth(): any {
    let currentItem = this.messagesData;
    this.depth.forEach((element: number, index: number) => {
      if (index !== this.depth.length - 1) {
        currentItem = (currentItem.children as any[])[index];
      }
    });
    return currentItem;
  }
}
