import {
  createServerModule,
  PseudoTerminal,
  PseudoTerminalConfig,
  PseudoTerminalFactory
} from '@angular-console/server';
import { NestFactory } from '@nestjs/core';
import { Store } from '@nrwl/angular-console-enterprise-electron';
import { existsSync, writeFile } from 'fs';
import { join } from 'path';

export interface IntellijTerminal {
  onDataWrite(callback: (data: string) => void): void;

  onExit(callback: (code: number) => void): void;

  exec(name: string, cwd: string, program: string, args: string[]): void;

  kill(): void;
}

export function getPseudoTerminalFactory(
  rpcServer: any
): PseudoTerminalFactory {
  return config => {
    return wsPseudoTerminalFactory(rpcServer, config);
  };
}

function wsPseudoTerminalFactory(
  terminal: IntellijTerminal,
  { name, program, args, cwd, displayCommand }: PseudoTerminalConfig
): PseudoTerminal {
  terminal.exec(name, cwd, program, args);

  return {
    onDidWriteData: callback => {
      const humanReadableCommand = `${displayCommand}\n\n\r`;
      callback(humanReadableCommand);

      terminal.onDataWrite((data: string) => {
        callback(data);
      });
    },
    onExit: callback => {
      terminal.onExit((code: number) => {
        callback(code);
      });
    },
    kill: () => {
      terminal.kill();
    }
  };
}

export async function startServer(
  port: number,
  publicDir: string,
  terminal: IntellijTerminal
) {
  try {
    console.log('RPC Server = ', terminal);

    const settingsPath = join(__dirname, 'settings.json');
    const settingsExist = existsSync(settingsPath);
    if (!settingsExist) {
      writeFile(settingsPath, '{}', () => {});
    }

    const storeMap: { [key: string]: any } = {};
    const store: Store = {
      get(key: string, defaultValue: any) {
        return storeMap[key] || defaultValue;
      },
      set(key: string, value: any) {
        storeMap[key] = value;
        writeFile(settingsPath, JSON.stringify(storeMap, null, 2), () => {});
      },
      delete(key: string) {
        delete storeMap[key];
      }
    };

    const showNotification = (
      message: string,
      notificationCommands: { label: string; action: any }[]
    ) => {
      console.log('n: ' + message + ', c: ', notificationCommands);
    };

    const selectDirectory = async (_args: any) => {
      throw new Error('Not implemented');
    };

    const pseudoTerminalFactory = getPseudoTerminalFactory(terminal);

    const exports = [
      'serverAddress',
      'store',
      'selectDirectory',
      'pseudoTerminalFactory',
      'assetsPath',
      'showNotification'
    ];

    const assetsPath = join(publicDir, 'assets/public');
    const providers = [
      { provide: 'serverAddress', useValue: `http://localhost:${port}` },
      { provide: 'store', useValue: store },
      { provide: 'selectDirectory', useValue: selectDirectory },
      { provide: 'pseudoTerminalFactory', useValue: pseudoTerminalFactory },
      { provide: 'assetsPath', useValue: assetsPath },
      { provide: 'showNotification', useValue: showNotification }
    ];

    console.log('starting server on port', port);
    console.log('showNotification = ', showNotification);

    const app = await NestFactory.create(
      createServerModule(exports, providers)
    );
    app.useStaticAssets(assetsPath);
    return await app.listen(port, 'localhost', () => {
      console.log(`Listening on port ${port}`);
    });
  } catch (e) {
    throw e;
  }
}
