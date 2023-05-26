import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActionBarModel, EventService, Keypad, SubscriptionService } from 'src/app/application/sdk';
import { SettingsChildrenModel, SettingsModel } from '../model';
import { SettingsService } from '../service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  providers: [SubscriptionService],
})
export class SettingsComponent implements OnInit {

  settingsData: SettingsChildrenModel;
  currentSettingsList: SettingsChildrenModel;
  depth: number[] = [];

  actionBar: ActionBarModel = {
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
    private settingsService: SettingsService,
    private eventService: EventService,
    private router: Router,
  ) { }

  ngOnInit() {
    this.getSettingsJSON();
    this.keypadListener();
  }

  getSettingsJSON() {
    this.subs.add(
      this.settingsService.loadSettings().subscribe((res: SettingsModel) => {
        this.settingsData = res.data;
        this.depth = [0];
        this.currentSettingsList = this.settingsData as SettingsChildrenModel;
      })
    );
  }

  keypadListener() {
    this.subs.add(
      this.eventService.getEvent().subscribe((res: any) => {
        switch (res) {
          case Keypad.D_PAD_CENTER: {
            this.currentSettingsList = (this.currentSettingsList.children as SettingsChildrenModel[])[this.getLastDepth()];
            this.addNewDepth();
            break;
          }
          case Keypad.ACTION_LEFT: {
            break;
          }
          case Keypad.ACTION_RIGHT: {
            if (this.depth.length > 1) {
              this.deleteOneDepth();
              this.currentSettingsList = this.getSettingsFromDepth();
            } else {
              this.router.navigateByUrl('/app/launcher/drawer');
            }
            break;
          }
          case Keypad.D_PAD_UP: {
            if (this.getLastDepth() === 0) {
              this.setLastDepth((this.currentSettingsList.children as SettingsChildrenModel[])?.length - 1);
            } else {
              this.setLastDepth(this.getLastDepth() - 1);
            }
            document.getElementById('' + this.getLastDepth())?.scrollIntoView({ behavior: "smooth", block: "start" });
            break;
          }
          case Keypad.D_PAD_DOWN: {
            if (this.getLastDepth() === (this.currentSettingsList.children as SettingsChildrenModel[]).length - 1) {
              this.setLastDepth(0);
            } else {
              this.setLastDepth(this.getLastDepth() + 1);
            }
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

  getSettingsFromDepth(): SettingsChildrenModel {
    let currentItem = this.settingsData;
    this.depth.forEach((element: number, index: number) => {
      if (index !== this.depth.length - 1) {
        currentItem = (currentItem.children as SettingsChildrenModel[])[index];
      }
    });
    return currentItem;
  }

}
