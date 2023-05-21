import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/module';
import { SdkModule } from '../sdk';
import { BaseComponent } from './base-landing';
import { PlayAreaComponent, StatusBarComponent } from './component';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    SdkModule,
    RouterModule
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
