import {
  Component,
  Inject,
  OnInit,
  ChangeDetectionStrategy
} from '@angular/core';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { Telemetry, Settings } from '@angular-console/utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  constructor(
    private readonly settingsService: Settings,
    @Inject('telemetry') private readonly telemetry: Telemetry
  ) {}

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

  setChannel(channel: 'latest' | 'beta' | 'alpha') {
    this.settingsService.setChannel(channel);
  }

  getChannel() {
    return this.settingsService.getChannel();
  }
}
