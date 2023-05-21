import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HardwareComponent } from './hardware-landing';
import { MaterialModule } from 'src/app/module';
import { ScreenComponent, KeypadComponent } from './component';
import { SdkModule } from '../sdk';

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    SdkModule
  ],
  declarations: [HardwareComponent, ScreenComponent, KeypadComponent],
  exports: [HardwareComponent],
})
export class HardwareModule { }
