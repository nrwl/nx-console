import { close, connect } from 'ij-rpc-client';

import { startServer } from './app/start-server';

const fixPath = require('fix-path');
const getPort = require('get-port');

const DOMAIN = 'ngConsoleServer';
let rpcServer: any = null;

async function bootstrap(publicDir: string) {
  fixPath();

  const port = await getPort({ port: 8888 });
  startServer(port, publicDir);

  console.log('Sending back to JAVA current angular-console port', publicDir);
  rpcServer.send(DOMAIN, 'serverStarted', port.toString());
}

// Port number passed from Intellij.
const rpcPort: number = parseInt(process.argv[process.argv.length - 1], 10);
try {
  rpcServer = connect(
    rpcPort,
    {
      ngConsoleServer: {
        start: (publicDir: string) => {
          console.log('starting server with following publicDir: ', publicDir);

          bootstrap(publicDir);
        },
        shutdown: () => {
          if (rpcServer !== null) {
            console.log('shutting down server with following dir: ');

            // call Angular server app shutdown. We can still simply kill the process from java
            rpcServer.send(DOMAIN, 'serverStopped');
            close(rpcServer);
          }
        }
      }
    }
  );
  rpcServer.send(DOMAIN, 'rpcInitialized');
} catch (e) {
  console.error(e);
}
