import { Settings, Telemetry } from '@angular-console/utils';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  constructor(
    readonly settings: Settings,
    @Inject('telemetry') private readonly telemetry: Telemetry
  ) {}

  toggleDataCollection(x: boolean) {
    this.settings.setCanCollectData(x);
    this.telemetry.reportDataCollectionEvent(x);
  }
}
