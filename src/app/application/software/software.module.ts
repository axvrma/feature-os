import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from './base';
import { PlayAreaComponent, StatusBarComponent } from './base';
import { MaterialModule } from 'src/app/module';
import { LauncherModule } from './apps';
import { RouterModule, Routes } from '@angular/router';
import { SoftwareComponent } from './software-landing';

const routes: Routes = [
  {
    path: 'base',
    component: BaseComponent,
    children: [
      {
        path: 'launcher',
        loadChildren: () => import('./apps/launcher').then(_ => _.LauncherModule)
      }
    ]
  }
]

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MaterialModule,
    LauncherModule
  ],
  declarations: [SoftwareComponent, BaseComponent, StatusBarComponent, PlayAreaComponent],
  exports: [SoftwareComponent]
})
export class SoftwareModule { }
