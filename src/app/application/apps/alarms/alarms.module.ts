import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AlarmsComponent } from './alarms-landing';

const routes: Routes = [
  {
    path: '',
    component: AlarmsComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ],
  declarations: [AlarmsComponent]
})
export class AlarmsModule { }
