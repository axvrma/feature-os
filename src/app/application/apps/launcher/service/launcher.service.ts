import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { APP_ROUTES } from '../../app.routes';
import { DrawerModel } from '../model';

@Injectable({
  providedIn: 'root'
})
export class LauncherService {

  private apps = APP_ROUTES.filter(app => !app.systemApp);
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
    this.apps.forEach((app, index: number) => {
      this.http.get(this.pkgRoute + app.path + this.pkgFormat).subscribe((res: any) => {
        this.appList[index] = res;
        // this.appList.push(res);
        if (this.appList.length === this.apps.length) {
          this.listComplete()
        }
      });
    });
  }

  private listComplete() {
    this.list.next(this.appList);
  }

  getListListener() {
    return this.list$;
  }
}
