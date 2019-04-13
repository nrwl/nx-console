import {
  createServerModule,
  nodePtyPseudoTerminalFactory
} from '@angular-console/server';
import { NestFactory } from '@nestjs/core';
import { Store } from '@nrwl/angular-console-enterprise-electron';
import { join } from 'path';
import { existsSync, writeFile } from 'fs';

export async function startServer(port: number, publicDir: string) {
  try {
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

    const selectDirectory = async (_args: any) => {
      throw new Error('Not implemented');
    };

    const exports = [
      'serverAddress',
      'store',
      'selectDirectory',
      'pseudoTerminalFactory',
      'assetsPath'
    ];

    const assetsPath = join(publicDir, 'assets/public');
    const providers = [
      { provide: 'serverAddress', useValue: `http://localhost:${port}` },
      { provide: 'store', useValue: store },
      { provide: 'selectDirectory', useValue: selectDirectory },
      {
        provide: 'pseudoTerminalFactory',
        useValue: nodePtyPseudoTerminalFactory
      },
      {
        provide: 'assetsPath',
        useValue: assetsPath
      }
    ];

    console.log('starting server on port', port);

    const app = await NestFactory.create(
      createServerModule(exports, providers)
    );
    app.useStaticAssets(assetsPath);
    return await app.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  } catch (e) {
    throw e;
  }
}
