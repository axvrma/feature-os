import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService implements OnDestroy {

  private subs: Subscription[] = [];

  constructor () { }

  add(subscription: Subscription) {
    this.subs?.push(subscription);
  }

  ngOnDestroy(): void {
    this.subs?.forEach(sub => sub.unsubscribe());
  }
}
