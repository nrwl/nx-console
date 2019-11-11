import { Store, Telemetry } from '@angular-console/server';
import { ExtensionContext, window, workspace } from 'vscode';

import { environment } from '../environments/environment';
import { VSCodeStorage } from './vscode-storage';

let telemetry: Telemetry;

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

  workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration(telemetrySetting)) {
      const enabled = store.get(enableTelemetry, true);
      if (enabled) {
        telemetry.startedTracking();
      } else {
        telemetry.stoppedTracking();
      }
    }
  });

  return telemetry;
}
