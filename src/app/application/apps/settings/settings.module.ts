import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SettingsComponent } from './settings-landing';
import { SdkModule } from '../../sdk';
import { MaterialModule } from 'src/app/module';

const routes: Routes = [
  {
    path: '',
    component: SettingsComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    SdkModule,
    RouterModule.forChild(routes),
    MaterialModule,
  ],
  declarations: [SettingsComponent]
})
export class SettingsModule { }
