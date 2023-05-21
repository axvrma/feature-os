import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/module';
import { EventService, KeypadListenerService, SubscriptionService } from './service';
import { ActionBarComponent } from './component';

const COMPONENT = [
  ActionBarComponent
];

const SERVICE = [
  SubscriptionService
]

@NgModule({
  imports: [
    CommonModule,
    MaterialModule
  ],
  declarations: COMPONENT,
  exports: COMPONENT,
  providers: SERVICE
})
export class SdkModule { }
