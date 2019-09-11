import { close, connect } from 'ij-rpc-client';
import { IntellijTerminal, startServer } from './app/start-server';
import * as getPort from 'get-port';

const fixPath = require('fix-path'); // tslint:disable-line

const DOMAIN = 'ngConsoleServer';
let terminal: TerminalProxy;
let rpcServer: any = null;

async function bootstrap(publicDir: string) {
  fixPath();

  const port = await getPort({ port: 8888 });
  startServer(port, publicDir, terminal).then(() => {
    console.log('Sending back to JAVA current angular-console port', publicDir);
    rpcServer.send(DOMAIN, 'serverStarted', port.toString());
  });
}

class TerminalProxy implements IntellijTerminal {
  sendData: (data: string) => void;
  sendExit: (code: number) => void;

  constructor(private readonly server: any) {}

  exec(name: string, cwd: string, program: string, args: string[]): void {
    rpcServer.send(
      DOMAIN,
      'terminalExec',
      JSON.stringify({
        name: name,
        cwd: cwd,
        program: program,
        args: args
      })
    );
  }

  kill(): void {
    if (this.server) {
      this.server.send(DOMAIN, 'terminalKill');
    }
  }

  onDataWrite(callback: (data: string) => void): void {
    this.sendData = callback;
  }

  onExit(callback: (code: number) => void): void {
    this.sendExit = callback;
  }
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
        },
        terminalDataWrite: (data: string) => {
          terminal.sendData(data);
        },

        onExit: (code: number) => {
          terminal.sendExit(code);
        }
      }
    }
  );
  terminal = new TerminalProxy(rpcServer);
  rpcServer.send(DOMAIN, 'rpcInitialized');
} catch (e) {
  console.error(e);
}
