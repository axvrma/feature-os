import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-status-bar',
  templateUrl: './status-bar.component.html',
  styleUrls: ['./status-bar.component.scss']
})
export class StatusBarComponent implements OnInit {

  iconList = [
    // 'call',
    // 'sms',
    // 'bluetooth',
    // 'wifi',
    'signal_cellular_alt',
    'battery_5_bar'
  ]

  constructor () { }

  ngOnInit() {
  }

}
