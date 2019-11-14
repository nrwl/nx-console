import { Store, Telemetry } from '@angular-console/server';
import { Disposable, ExtensionContext, window, workspace } from 'vscode';

import { environment } from '../environments/environment';
import { VSCodeStorage } from './vscode-storage';

let telemetry: Telemetry;
let disposer: Disposable | null = null;

export function getTelemetry() {
  return telemetry;
}

// using shared memory here is a shortcut, this should be an api call
export function initTelemetry(context: ExtensionContext, store: Store) {
  telemetry = environment.disableTelemetry
    ? Telemetry.withLogger(store)
    : Telemetry.withGoogleAnalytics(store, 'vscode');

  if (!context.globalState.get('shownTelemetryPrompt')) {
    window.showInformationMessage(
      'Help improve Angular Console by allowing us to collect data. To opt-out set angularConsole.enableTelemetry to false in settings.'
    );

    context.globalState.update('shownTelemetryPrompt', true);
  }

  const enableTelemetry = 'enableTelemetry';
  const configurationSection = VSCodeStorage.configurationSection;
  const telemetrySetting = `${configurationSection}.${enableTelemetry}`;

  disposer = workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration(telemetrySetting)) {
      if (store.get(enableTelemetry, true)) {
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
