import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as request from 'request';
import { platform } from 'os';
import { exists } from '../utils';
import * as progress from 'progress-stream';
import { InstallNodeJsStatus } from '../graphql-types';
import { dirSync } from 'tmp';

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
export let nodeInstallDone: boolean = true;

export function installNodeJs(): InstallNodeJsStatus {
  nodeDownloadProgress = null;
  nodeDownload = null;
  nodeInstallDone = false;
  const tmpDir = dirSync();
  try {
    switch (platform()) {
      case 'darwin':
        nodeDownloadProgress = progress({
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
        )
          .pipe(nodeDownloadProgress)
          .pipe(pkg);
        return {};
      case 'win32':
        nodeDownloadProgress = progress({
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
        )
          .pipe(nodeDownloadProgress)
          .pipe(msi);

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
