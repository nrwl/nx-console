import { Injectable, OnDestroy } from '@angular/core';
import { NavigationEnd, NavigationExtras, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RouterNavigation implements OnDestroy {
  // Always keep track of the current and prev url so we can navigate to the
  // previous one when navigateToPrevious is used.
  private url: string;
  private prevUrl: string;

  navSubscription: Subscription;

  constructor(private readonly router: Router) {}

  init() {
    this.navSubscription = this.router.events
      .pipe(
        filter(
          (evt): evt is NavigationEnd => {
            return evt instanceof NavigationEnd;
          }
        )
      )
      .subscribe(evt => {
        this.prevUrl = this.url;
        this.url = evt.url;
      });
  }

  ngOnDestroy() {
    this.navSubscription.unsubscribe();
  }

  async navigateToPrevious(fallback: any[], extras?: NavigationExtras) {
    if (this.prevUrl) {
      await this.router.navigateByUrl(this.prevUrl, extras);
    } else {
      await this.router.navigate(fallback, extras);
    }
  }
}
