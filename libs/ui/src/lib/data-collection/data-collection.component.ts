import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Settings } from '@angular-console/utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-data-collection',
  templateUrl: './data-collection.component.html',
  styleUrls: ['./data-collection.component.scss']
})
export class DataCollectionComponent {
  constructor(private readonly settings: Settings) {}

  get showMessage() {
    return this.settings.canCollectData() === undefined;
  }

  close(value: boolean) {
    this.settings.setCanCollectData(value);
  }
}
