import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApplicationComponent } from './landing-application';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from '../module';
import { HardwareModule } from './hardware';
import { SoftwareModule } from './software';

const routes: Routes = [
  {
    path: 'app',
    component: ApplicationComponent,
    children: [
      {
        path: 'sw',
        loadChildren: () => import('./software').then(_ => _.SoftwareModule)
      }
    ]
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MaterialModule,
    HardwareModule,
    SoftwareModule
  ],
  declarations: [ApplicationComponent]
})
export class ApplicationModule { }
