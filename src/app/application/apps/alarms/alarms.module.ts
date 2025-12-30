import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from 'src/app/module';
import { SdkModule } from '../../sdk';
import { AlarmsComponent } from './screen/alarms-landing';

const routes: Routes = [
  {
    path: '',
    component: AlarmsComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SdkModule,
    MaterialModule
  ],
  declarations: [AlarmsComponent]
})
export class AlarmsModule { }
