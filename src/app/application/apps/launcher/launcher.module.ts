import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LauncherComponent } from './landing-launcher';
import { MaterialModule } from 'src/app/module';
import { DateTimeWidgetComponent } from './component';
import { HomeComponent, DrawerComponent } from './screen';
import { RouterModule, Routes } from '@angular/router';
import { SdkModule } from '../../sdk/sdk.module';

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
    SdkModule,
    RouterModule.forChild(routes),
    MaterialModule,
  ],
  declarations: [LauncherComponent, DateTimeWidgetComponent, HomeComponent, DrawerComponent],
  exports: [LauncherComponent]
})
export class LauncherModule { }
