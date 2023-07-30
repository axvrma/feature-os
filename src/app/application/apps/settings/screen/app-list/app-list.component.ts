import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../../service';

@Component({
  selector: 'app-app-list',
  templateUrl: './app-list.component.html',
  styleUrls: ['./app-list.component.scss']
})
export class AppListComponent implements OnInit {

  constructor (
    private settings: SettingsService
  ) { }

  ngOnInit() {
  }

  getAppList() {
    this.settings.getAppList();
  }

}
