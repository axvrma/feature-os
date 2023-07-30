import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MaterialModule } from 'src/app/module';
import { ActionBarComponent, LittleListComponent, SafeAreaComponent, ScaffoldComponent } from './component';
import { SubscriptionService } from './service';

const COMPONENT = [
  ActionBarComponent,
  ScaffoldComponent,
  LittleListComponent,
  SafeAreaComponent
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
