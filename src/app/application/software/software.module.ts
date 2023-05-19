import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent, SubscriptionService } from './base';
import { PlayAreaComponent, StatusBarComponent, EventService } from './base';
import { MaterialModule } from 'src/app/module';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'app',
    component: BaseComponent,
    children: [
      {
        path: 'launcher',
        loadChildren: () => import('./apps').then(_ => _.LauncherModule)
      },
      {
        path: 'phone',
        loadChildren: () => import('./apps').then(_ => _.PhoneModule)
      }
    ]
  }
]

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MaterialModule
  ],
  declarations: [
    BaseComponent,
    StatusBarComponent,
    PlayAreaComponent,
  ],
  exports: [BaseComponent],
  providers: [
    EventService,
    SubscriptionService
  ]
})
export class SoftwareModule { }
