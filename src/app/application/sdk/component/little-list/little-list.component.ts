import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-little-list',
  templateUrl: './little-list.component.html',
  styleUrls: ['./little-list.component.scss']
})
export class LittleListComponent implements OnInit {

  @Input() data: any;
  @Input() currentRow: number;

  constructor () { }

  ngOnInit() {
  }

}
