import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  constructor (
    private http: HttpClient
  ) { }

  loadSettings() {
    return this.http.get('/assets/apps/settings.pkg.json');
  }

}
