import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BaseComponent } from './base-landing';
import { PlayAreaComponent, StatusBarComponent } from './component';
import { SdkModule } from '../sdk';
import { MaterialModule } from 'src/app/module';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    SdkModule,
    MaterialModule
  ],
  declarations: [
    BaseComponent,
    StatusBarComponent,
    PlayAreaComponent
  ],
  exports: [
    BaseComponent
  ]
})
export class SoftwareModule { }
