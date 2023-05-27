import { Component, OnInit } from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-application',
  templateUrl: './application.component.html',
  styleUrls: ['./application.component.scss']
})
export class ApplicationComponent {

  toggleChange(e: MatSlideToggleChange) {
    if (e.checked) {
      // enable dark theme
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
    } else {
      // enable light theme
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    }
  }

}
