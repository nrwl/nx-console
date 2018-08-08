import { Component } from '@angular/core';
import { AnalyticsCollector, Settings } from '@angular-console/utils';

@Component({
  selector: 'ui-data-collection',
  templateUrl: './data-collection.component.html',
  styleUrls: ['./data-collection.component.scss']
})
export class DataCollectionComponent {
  constructor(
    private readonly analytics: AnalyticsCollector,
    private readonly settings: Settings
  ) {}

  get showMessage() {
    return this.settings.canCollectData() === undefined;
  }

  close(value: boolean) {
    this.settings.setCanCollectData(value);
    this.analytics.reportDataCollectionEvent(value);
  }
}
