import { Store } from '@nx-console/shared/schema';
import { Disposable, window, workspace } from 'vscode';

import { Telemetry } from './telemetry';

let telemetry: Telemetry;
let disposer: Disposable | null = null;

export function getTelemetry() {
  return telemetry;
}

const enableTelemetry = 'enableTelemetry';
const telemetrySetting = `nxConsole.${enableTelemetry}`;

// using shared memory here is a shortcut, this should be an api call
export function initTelemetry(store: Store, production: boolean) {
  telemetry = production
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
