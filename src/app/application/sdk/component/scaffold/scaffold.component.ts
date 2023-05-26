import { Component, Input, OnInit } from '@angular/core';
import { ActionBarModel } from '../../model';

@Component({
  selector: 'app-scaffold',
  templateUrl: './scaffold.component.html',
  styleUrls: ['./scaffold.component.scss']
})
export class ScaffoldComponent implements OnInit {

  @Input() appName: string;
  @Input() actions: ActionBarModel;

  constructor () { }

  ngOnInit() {
  }

}
