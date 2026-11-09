import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DeviceShellComponent } from './shell/device-shell.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DeviceShellComponent],
  template: '<os-device-shell />',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class AppComponent {}
