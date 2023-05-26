import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MessagesService {

  constructor (
    private http: HttpClient
  ) { }

  loadMessages(): Observable<any> {
    return this.http.get('/assets/apps/messages.pkg.json') as any;
  }

}
