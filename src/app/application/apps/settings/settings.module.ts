import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from 'src/app/module';
import { SdkModule } from '../../sdk';
import { SettingsComponent } from './settings-landing';

const routes: Routes = [
  {
    path: '',
    component: SettingsComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SdkModule,
    MaterialModule
  ],
  declarations: [SettingsComponent]
})
export class SettingsModule { }
