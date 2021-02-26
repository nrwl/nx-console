import { Store, Telemetry } from '@nx-console/server';
import { Disposable, window, workspace } from 'vscode';

import { environment } from '../environments/environment';
import { VSCodeStorage } from './vscode-storage';

let telemetry: Telemetry;
let disposer: Disposable | null = null;

export function getTelemetry() {
  return telemetry;
}

const enableTelemetry = 'enableTelemetry';
const configurationSection = VSCodeStorage.configurationSection;
const telemetrySetting = `${configurationSection}.${enableTelemetry}`;

// using shared memory here is a shortcut, this should be an api call
export function initTelemetry(store: Store) {
  telemetry = environment.production
    ? Telemetry.withGoogleAnalytics(store, 'vscode')
    : Telemetry.withLogger(store);

  if (!store.get('shownTelemetryPrompt')) {
    window.showInformationMessage(
      'Help improve Nx Console by allowing us to collect data. To opt-out set nxConsole.enableTelemetry to false in settings.'
    );

    store.set('shownTelemetryPrompt', true);
  }

  disposer = workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(telemetrySetting)) {
      if (store.get(enableTelemetry)) {
        telemetry.startedTracking();
      } else {
        telemetry.stoppedTracking();
      }
    }
  });

  return telemetry;
}

export function teardownTelemetry() {
  if (disposer) {
    disposer.dispose();
  }
}
