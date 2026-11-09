import { ErrorHandler, Injectable, inject } from '@angular/core';
import { OsStateService } from './os-state.service';
@Injectable()
export class OsErrorHandler implements ErrorHandler {
  private readonly os = inject(OsStateService);
  handleError(error: unknown): void {
    console.error(error);
    this.os.feedback(`Something went wrong: ${this.os.describe(error)}`);
  }
}
