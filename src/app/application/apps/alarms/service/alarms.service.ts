import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AlarmsService {

  constructor (
    private http: HttpClient
  ) { }

  loadAlarms(): Observable<any> {
    return this.http.get('/assets/apps/alarms.pkg.json') as any;
  }
}
