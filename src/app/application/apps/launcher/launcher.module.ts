import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from 'src/app/module';
import { SdkModule } from '../../sdk';
import { DateTimeWidgetComponent } from './component';
import { LauncherComponent } from './landing-launcher';
import { DrawerComponent, HomeComponent } from './screen';

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
    SdkModule,
    MaterialModule
  ],
  declarations: [LauncherComponent, DateTimeWidgetComponent, HomeComponent, DrawerComponent],
  exports: [LauncherComponent]
})
export class LauncherModule { }
