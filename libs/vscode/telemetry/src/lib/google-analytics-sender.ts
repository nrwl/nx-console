import { GoogleAnalytics, TelemetryEvents } from '@nx-console/shared-telemetry';
import { env, ExtensionContext, extensions, TelemetrySender } from 'vscode';

import { onWorkspaceRefreshed } from '@nx-console/vscode-lsp-client';
import { getNxVersion } from '@nx-console/vscode-nx-workspace';
import { vscodeLogger } from '@nx-console/vscode-output-channels';

import Rollbar = require('rollbar/src/browser/rollbar');

export class GoogleAnalyticsSender implements TelemetrySender {
  private _nxVersion: string | undefined;

  private _version: string =
    extensions.getExtension('nrwl.angular-console')?.packageJSON?.version ??
    '0.0.0';

  private os = process.platform;

  private rollbar = new Rollbar({
    accessToken: 'd7f75cfc52e745b697be89ef23dbe436',
    captureUncaught: false,
    captureUnhandledRejections: false,
    captureIp: false,
    environment: `${this._version}-${this.os}`,
  });

  private analytics: GoogleAnalytics;

  constructor(
    private production: boolean,
    context: ExtensionContext,
  ) {
    this.analytics = new GoogleAnalytics(
      this.production ? 'production' : 'debug_view',
      env.machineId,
      env.machineId,
      env.sessionId,
      this._version,
      env.appName.toLowerCase().includes('cursor') ? 'cursor' : 'vscode',
      vscodeLogger,
      this._nxVersion,
    );

    getNxVersion().then((version) => {
      this._nxVersion = version?.full;
      if (this._nxVersion) {
        this.analytics.setNxVersion(this._nxVersion);
      }
    });

    context.subscriptions.push(
      onWorkspaceRefreshed(async () => {
        const version = await getNxVersion();
        this._nxVersion = version?.full;
        if (this._nxVersion) {
          this.analytics.setNxVersion(this._nxVersion);
        }
      }),
    );
  }

  sendEventData(eventName: TelemetryEvents, data?: Record<string, any>): void {
    if (env.isTelemetryEnabled) {
      this.analytics.sendEventData(eventName, data);
    }
  }

  sendErrorData(error: Error, data?: Record<string, any>): void {
    if (!env.isTelemetryEnabled) {
      return;
    }

    vscodeLogger.log(`Uncaught Exception: ${error}`);

    const shouldLogToRollbar = this.production
      ? Math.floor(Math.random() * 5) === 0
      : true;
    if (shouldLogToRollbar) {
      this.rollbar.error(error);
    }
    // there is a special case of error that we handle but still want to get more details on in rollbar - don't track those in GA
    if (error.message.startsWith('AIFAIL')) {
      return;
    }
    this.sendEventData('misc.exception', {
      ...data,
      name: error.name,
    });
  }
}
