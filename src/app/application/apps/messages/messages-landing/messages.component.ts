import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActionBarModel, EventService, Keypad, KeypadAction, SubscriptionService } from 'src/app/application/sdk';
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

  keypadAction: KeypadAction = {
    [Keypad.D_PAD_UP]: () => {

    },
    [Keypad.D_PAD_DOWN]: () => {

    }
  }

  constructor (
    private subs: SubscriptionService,
    private messagesService: MessagesService
  ) { }

  ngOnInit() {
    this.getMessagesJSON();
  }

  getMessagesJSON() {
    this.subs.add(
      this.messagesService.loadMessages().subscribe((res: any) => {
        this.messagesData = res.data;
        this.depth = [0];
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
