import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApplicationComponent } from './application-landing';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from '../module';
import { HardwareModule } from './hardware';
import { SoftwareModule } from './software';
import { APP_ROUTES } from './apps';
import { SdkModule } from './sdk';

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
    MaterialModule,
    HardwareModule,
    SoftwareModule,
    SdkModule
  ],
  declarations: [ApplicationComponent]
})
export class ApplicationModule { }
