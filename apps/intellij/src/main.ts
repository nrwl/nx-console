import * as rcpNode from 'ij-rpc-client';

import { startServer } from './app/start-server';

const fixPath = require('fix-path');
const getPort = require('get-port');

async function bootstrap(publicDir: string, port: number) {
  fixPath();

  port = port || (await getPort({ port: 8888 }));
  startServer(port, publicDir);
}

const DOMAIN = 'ngConsoleServer';

// Port number passed from Intellij.
const rpcPort: number = parseInt(process.argv[process.argv.length - 1], 10);
try {
  const rpcServer = rcpNode.connect(rpcPort, {
    ngConsoleServer: {
      start: (publicDir: string, port: number) => {
        console.log('starting server with following dir: ', publicDir);

        bootstrap(publicDir, port);

        rpcServer.send(DOMAIN, 'serverStarted');
      },
      shutdown: () => {
        if (rpcServer != null) {
          console.log('shutting down server with following dir: ');

          // call Angular server app shutdown. We can still simply kill the process from java

          rcpNode.close(rpcServer);
          rpcServer.send(DOMAIN, 'serverStopped');
        }
      }
    }
  });
  rpcServer.send(DOMAIN, 'rpcInitialized');
} catch (e) {}
