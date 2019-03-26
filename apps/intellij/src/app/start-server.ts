import {
  createServerModule,
  nodePtyPseudoTerminalFactory
} from '@angular-console/server';
import { NestFactory } from '@nestjs/core';
import { Store } from '@nrwl/angular-console-enterprise-electron';
import * as path from 'path';

export async function startServer(port: number, publicDir: string) {
  try {
    const storeMap = new Map();
    const store: Store = {
      get(key: string, defaultValue: any) {
        return storeMap.has(key) ? storeMap.get(key) : defaultValue;
      },
      set(key: string, value: any) {
        storeMap.set(key, value);
      },
      delete(key: string) {
        storeMap.delete(key);
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

    const assetsPath = path.join(publicDir, 'assets/public');
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
    await app.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  } catch (e) {
    throw e;
  }
}
