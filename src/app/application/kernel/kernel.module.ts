import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeypadListenerService } from './service';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [KeypadListenerService]
})
export class KernelModule { }
