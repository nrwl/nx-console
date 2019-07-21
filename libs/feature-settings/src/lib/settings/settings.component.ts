import { Settings, Telemetry } from '@angular-console/utils';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'angular-console-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnDestroy, OnInit {
  destroyed$ = new Subject();

  constructor(
    private readonly telemetry: Telemetry,
    readonly settings: Settings,
    private readonly contextualActionBarService: ContextualActionBarService,
    router: Router
  ) {
    router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroyed$)
      )
      .subscribe(e => {
        if (e.urlAfterRedirects === '/settings') {
          // TODO: This logic belong within the settings component after electron redesign.
          this.contextualActionBarService.breadcrumbs$.next([
            { title: 'Settings' }
          ]);
        }
      });
  }

  ngOnInit() {
    this.telemetry.screenViewed('Settings');
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  toggleDataCollection(x: boolean) {
    this.settings.setCanCollectData(x);
  }
}
