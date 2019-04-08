import { exec } from 'child_process';
import * as fs from 'fs';
import { platform } from 'os';
import * as request from 'request';
import { dirSync } from 'tmp';

import { InstallNodeJsStatus } from '@angular-console/schema';

export interface Progress extends fs.WriteStream {
  progress(): {
    percentage: number;
    transferred: number;
    length: number;
    remaining: number;
    eta: number;
    runtime: number;
    delta: number;
    speed: number;
  };
}

export let nodeDownloadProgress: Progress | null = null;
export let nodeDownload: fs.WriteStream | null = null;
export let nodeInstallDone = true;

export function installNodeJs(): InstallNodeJsStatus {
  nodeDownloadProgress = null;
  nodeDownload = null;
  nodeInstallDone = false;
  const tmpDir = dirSync();
  try {
    switch (platform()) {
      case 'darwin':
        nodeDownloadProgress = require('progress-stream')({
          length: 15546624,
          time: 100
        }) as Progress;

        const pkg = fs
          .createWriteStream(`${tmpDir.name}/node.pkg`)
          .on('finish', () => {
            pkg.close();
            exec(`open ${tmpDir.name}/node.pkg`).on('close', () => {
              nodeInstallDone = true;
            });
          });

        nodeDownload = request(
          'http://nodejs.org/dist/v8.12.0/node-v8.12.0.pkg'
        ).pipe(
          nodeDownloadProgress,
          pkg as any
        );
        return {};
      case 'win32':
        nodeDownloadProgress = require('progress-stream')({
          length: 14680064,
          time: 100
        }) as Progress;
        const msi = fs
          .createWriteStream(`${tmpDir.name}/node.msi`)
          .on('finish', () => {
            msi.close();
            exec(`msiexec /i "${msi.path}"`).on('close', () => {
              nodeInstallDone = true;
            });
          });

        nodeDownload = request(
          'http://nodejs.org/dist/v8.12.0/node-v8.12.0-x64.msi'
        ).pipe(
          nodeDownloadProgress,
          msi as any
        );

        return {};
      default:
        return {
          cancelled: true,
          error: 'Unsupported platform'
        };
    }
  } catch (e) {
    nodeInstallDone = true;

    console.log(e);
    return {
      cancelled: true,
      error: e.message
    };
  }
}
