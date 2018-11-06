import { Component, Inject } from '@angular/core';
import { Telemetry, Settings } from '@angular-console/utils';

@Component({
  selector: 'ui-data-collection',
  templateUrl: './data-collection.component.html',
  styleUrls: ['./data-collection.component.scss']
})
export class DataCollectionComponent {
  constructor(
    @Inject('telemetry') private readonly telemetry: Telemetry,
    private readonly settings: Settings
  ) {}

  get showMessage() {
    return this.settings.canCollectData() === undefined;
  }

  close(value: boolean) {
    this.settings.setCanCollectData(value);
    this.telemetry.reportDataCollectionEvent(value);
  }
}
