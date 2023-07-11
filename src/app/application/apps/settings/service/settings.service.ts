import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SettingsModel } from '../model';
import { APP_ROUTES } from '../../app.routes';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  constructor (
    private http: HttpClient
  ) { }

  loadSettings(): Observable<SettingsModel> {
    return this.http.get('/assets/apps/settings.pkg.json') as any;
  }

  getAppList() {
    return APP_ROUTES.filter(app => app.path);
  }

}
