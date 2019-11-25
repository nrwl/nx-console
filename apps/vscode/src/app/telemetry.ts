import { Store, Telemetry } from '@angular-console/server';
import { Disposable, ExtensionContext, window, workspace } from 'vscode';

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

  disposer = workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration(telemetrySetting)) {
      updateTelemetryTracking();
    }
  });

  updateTelemetryTracking();

  return telemetry;
}

function updateTelemetryTracking() {
  const configuration = workspace.getConfiguration(
    VSCodeStorage.configurationSection
  );
  const enabled = configuration.get('enableTelemetry');
  if (enabled === true || typeof enabled === 'undefined') {
    telemetry.startedTracking();
  } else {
    telemetry.stoppedTracking();
  }
}

export function teardownTelemetry() {
  if (disposer) {
    disposer.dispose();
  }
}
