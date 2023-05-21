import { Component, Input, OnInit } from '@angular/core';
import { ActionBarModel } from '../../model/action-bar.model';

@Component({
  selector: 'app-action-bar',
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.scss']
})
export class ActionBarComponent implements OnInit {

  @Input() actions: ActionBarModel;
  @Input() hide: boolean = false;

  constructor () { }

  ngOnInit() {
  }

}
