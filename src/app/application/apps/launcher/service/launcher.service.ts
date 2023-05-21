import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DrawerModel } from '../model';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LauncherService {

  private apps = ['phone', 'messages', 'calendar', 'calculator', 'alarms', 'settings'];
  private pkgRoute = '/assets/apps/';
  private pkgFormat = '.pkg.json';

  private appList: DrawerModel[] = [];

  private list = new Subject();
  private list$ = this.list.asObservable();

  constructor (
    private http: HttpClient
  ) { this.getPkgs() }

  getList() {
    return this.appList;
  }

  getPkgs() {
    this.apps.forEach(app => {
      this.http.get(this.pkgRoute + app + this.pkgFormat).subscribe((res: any) => {
        this.appList.push(res);
      });
    });
    setTimeout(() => this.listComplete(), 100);
  }

  private listComplete() {
    this.list.next(this.appList);
  }

  getListListener() {
    return this.list$;
  }
}
