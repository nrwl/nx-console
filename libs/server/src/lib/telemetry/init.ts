import { Telemetry } from './telemetry';
import {
  Disposable,
  ExtensionContext,
  ExtensionMode,
  window,
  workspace,
} from 'vscode';
import { Store } from '@nx-console/schema';

let telemetry: Telemetry;
let disposer: Disposable | null = null;

export function getTelemetry() {
  return telemetry;
}

const enableTelemetry = 'enableTelemetry';
const telemetrySetting = `nxConsole.${enableTelemetry}`;

export function initTelemetry(store: Store, context: ExtensionContext) {
  const telemetry = Telemetry.withGoogleAnalytics(store);

  if (context.extensionMode === ExtensionMode.Development) {
    Telemetry.withLogger(store);
  }

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
