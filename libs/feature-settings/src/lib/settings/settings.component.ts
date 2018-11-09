import { Component, Inject, OnInit } from '@angular/core';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { Telemetry, Settings } from '@angular-console/utils';

@Component({
  selector: 'angular-console-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  constructor(
    private readonly contextActionService: ContextualActionBarService,
    private readonly settingsService: Settings,
    @Inject('telemetry') private readonly telemetry: Telemetry
  ) {}

  ngOnInit() {
    this.contextActionService.breadcrumbs$.next([{ title: 'Settings' }]);
  }

  canCollectionData() {
    return this.settingsService.canCollectData();
  }

  toggleDataCollection(x: boolean) {
    this.settingsService.setCanCollectData(x);
    this.telemetry.reportDataCollectionEvent(x);
  }

  enableDetailedStatus() {
    return this.settingsService.enableDetailedStatus();
  }

  toggleDetailedStatus(x: boolean) {
    this.settingsService.setEnableDetailedStatus(x);
  }
}
