import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from 'src/app/module';
import { SdkModule } from '../../sdk';
import { PhoneComponent } from './phone-landing';

const routes: Routes = [
  {
    path: '',
    component: PhoneComponent
  }
]

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SdkModule,
    MaterialModule
  ],
  declarations: [PhoneComponent]
})
export class PhoneModule { }
