import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WelcomeComponent } from './welcome';

const routes: Routes = [
  {
    path: '',
    component: WelcomeComponent
  },
  {
    path: 'app',
    loadChildren: () => import('./application').then(_ => _.ApplicationModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
