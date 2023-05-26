import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from 'src/app/module';
import { SdkModule } from '../../sdk';
import { CalendarComponent } from './calendar-landing';

const routes: Routes = [
  {
    path: '',
    component: CalendarComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SdkModule,
    MaterialModule
  ],
  declarations: [CalendarComponent]
})
export class CalendarModule { }
