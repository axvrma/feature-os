import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LauncherComponent } from './landing-launcher';
import { MaterialModule } from 'src/app/module';
import { ActionBarComponent, DateTimeWidgetComponent } from './component';
import { HardwareModule } from 'src/app/application/hardware';
import { HomeComponent, DrawerComponent } from './screen';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    component: LauncherComponent,
    children: [
      {
        path: 'home',
        component: HomeComponent
      },
      {
        path: 'drawer',
        component: DrawerComponent
      }
    ]
  }
]

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MaterialModule,
    HardwareModule
  ],
  declarations: [LauncherComponent, DateTimeWidgetComponent, HomeComponent, DrawerComponent, ActionBarComponent],
  exports: [LauncherComponent]
})
export class LauncherModule { }
