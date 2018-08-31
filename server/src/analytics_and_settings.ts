/* tslint:disable */

import * as ua from 'universal-analytics';
import { ipcMain } from 'electron';
const uuidv4 = require('uuid/v4');
const Store = require('electron-store');
const store = new Store();

const visitor = new ua.Visitor('UA-88380372-8', getUuiId(), {
  https: true
});

// must be called before electron app is created
export function setupEvents() {
  process.env.trackingID = 'UA-88380372-8';
  ipcMain.on('reportEvent', (event: any, arg: any) =>
    reportEvent(arg.categroy, arg.action, arg.label, arg.value)
  );
  ipcMain.on('dataCollectionEvent', (event: any, arg: any) =>
    dataCollectionEvent(arg.value)
  );
  ipcMain.on('reportPageView', (event: any, arg: any) =>
    reportPageView(arg.path)
  );
  ipcMain.on('reportException', (event: any, arg: any) =>
    reportException(arg.description)
  );
}

export function dataCollectionEvent(value: boolean) {
  visitor
    .event('DataCollection', 'DataCollectionResponse', value.toString())
    .send();
}

export function reportEvent(
  category: string,
  action: string,
  label?: string,
  value?: number
) {
  if (canCollectData()) {
    if (value) {
      visitor.event(category, action, label!, value, {}).send();
    } else {
      visitor.event(category, action, label!).send();
    }
  }
}

export function reportException(description: string) {
  if (canCollectData()) {
    console.error(description);
    visitor.exception(description).send();
  }
}

export function reportPageView(path: string) {
  if (canCollectData()) {
    visitor.pageview(path, 'Angular Console', '6.0.0-beta.2').send();
  }
}

function getUuiId() {
  if (store.get('uuid')) {
    return store.get('uuid');
  }
  const uuid = uuidv4();
  store.set('uuid', uuid);
  return uuid;
}

function canCollectData(): boolean {
  const settings = store.get('settings');
  return settings && settings.canCollectData;
}
