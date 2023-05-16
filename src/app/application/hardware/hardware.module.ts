import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HardwareComponent } from './hardware-landing';
import { MaterialModule } from 'src/app/module';
import { ScreenComponent, KeypadComponent } from './component';
import { KeypadListenerService } from './service';

@NgModule({
  imports: [
    CommonModule,
    MaterialModule
  ],
  declarations: [HardwareComponent, ScreenComponent, KeypadComponent],
  exports: [HardwareComponent],
  providers: [KeypadListenerService]
})
export class HardwareModule { }
