import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  settingsJson: any;

  constructor (
    private settingsService: SettingsService
  ) { }

  ngOnInit() {
    this.settingsService.loadSettings().subscribe((res: any) => {
      // console.log(res);
      this.settingsJson = res.children;
    })
  }

}
