
import * as ua from 'universal-analytics';
import uuidv4 = require('uuid/v4');

export class Telemetry {
  private readonly visitor = new ua.Visitor('UA-88380372-8', this.getUuiId(), {
    https: true,
  });

  constructor(private readonly store: any) {}

  dataCollectionEvent(value: boolean) {
    try {
      this.visitor
        .event('DataCollection', 'DataCollectionResponse', value.toString())
        .send();
    } catch (e) {
      console.error('dataCollectionEvent', e);
    }
  }

  reportEvent(
    category: string,
    action: string,
    label?: string,
    value?: number
  ) {
    try {
      if (value) {
        this.visitor.event(category, action, label!, value, {}).send();
      } else {
        this.visitor.event(category, action, label!).send();
      }
    } catch (e) {
      console.error('reportEvent', e);
    }
  }

  reportLifecycleEvent(action: string) {
    try {
      if (this.canCollectData()) {
        this.visitor.event('Lifecycle', action).send();
      }
    } catch (e) {
      console.error('reportLifecycleEvent', e);
    }
  }

  reportException(description: string) {
    try {
      if (this.canCollectData()) {
        console.error(description);
        this.visitor.exception(description).send();
      }
    } catch (e) {
      console.error('reportException', e);
    }
  }

  reportPageView(path: string) {
    try {
      if (this.canCollectData()) {
        this.visitor.pageview(path, 'Nx Console', '6.0.0').send();
      }
    } catch (e) {
      console.error('reportPageView', e);
    }
  }

  private getUuiId() {
    if (this.store.get('uuid')) {
      return this.store.get('uuid');
    }
    const uuid = uuidv4();
    this.store.set('uuid', uuid);
    return uuid;
  }

  private canCollectData(): boolean {
    const settings = this.store.get('settings');
    return settings && settings.canCollectData;
  }
}
