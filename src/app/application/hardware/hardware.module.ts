import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MaterialModule } from 'src/app/module';
import { SdkModule } from '../sdk';
import { KeypadComponent, ScreenComponent } from './component';
import { HardwareComponent } from './hardware-landing';

@NgModule({
  imports: [
    CommonModule,
    SdkModule,
    MaterialModule
  ],
  declarations: [HardwareComponent, ScreenComponent, KeypadComponent],
  exports: [HardwareComponent],
})
export class HardwareModule { }
