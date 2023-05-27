import { NgModule } from '@angular/core';

// Material
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';


const materialElements = [
  MatSlideToggleModule,
  MatGridListModule,
  MatIconModule,
  MatButtonModule,
  MatCardModule,
  MatDividerModule,
  MatListModule,
  MatToolbarModule,
  MatSlideToggleModule
]

@NgModule({
  imports: materialElements,
  exports: materialElements,
  declarations: []
})
export class MaterialModule { }
