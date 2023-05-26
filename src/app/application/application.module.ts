import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from '../module';
import { ApplicationComponent } from './application-landing';
import { APP_ROUTES } from './apps';
import { HardwareModule } from './hardware';
import { SoftwareModule } from './software';

const routes: Routes = [
  {
    path: '',
    component: ApplicationComponent,
    children: APP_ROUTES
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    HardwareModule,
    SoftwareModule,
    MaterialModule
  ],
  declarations: [ApplicationComponent]
})
export class ApplicationModule { }
