import { getNxWorkspacePath } from '@nx-console/vscode/nx-workspace';
import { ChildProcess, spawn } from 'child_process';
import { createServer } from 'net';
import { getPackageManagerCommand } from 'nx/src/devkit-exports';
import { xhr } from 'request-light';
import { Disposable, EventEmitter, ExtensionContext } from 'vscode';

let nxGraphServer: NxGraphServer | undefined = undefined;
let nxGraphServerAffected: NxGraphServer | undefined = undefined;

export function getNxGraphServer(context: ExtensionContext, affected = false) {
  if (affected) {
    if (!nxGraphServerAffected) {
      nxGraphServerAffected = new NxGraphServer(5567, affected);
      nxGraphServerAffected.start();
      context.subscriptions.push(nxGraphServerAffected);
    }
    return nxGraphServerAffected;
  }
  if (!nxGraphServer) {
    nxGraphServer = new NxGraphServer(5566);
    nxGraphServer.start();
    context.subscriptions.push(nxGraphServer);
  }

  return nxGraphServer;
}

export class NxGraphServer implements Disposable {
  private currentPort: number | undefined = undefined;
  private nxGraphProcess: ChildProcess | undefined = undefined;

  isStarting = false;
  isStarted = false;
  updatedEventEmitter = new EventEmitter();

  constructor(private startPort: number, private affected = false) {}

  async handleWebviewRequest(request: {
    type: string;
    id: string;
    payload: string;
  }): Promise<
    | {
        type: string;
        id: string;
        payload: string;
      }
    | undefined
  > {
    console.log('request, isCrashed', this.isCrashed);
    if (this.isCrashed) {
      await this.start();
    }
    if (!this.isStarted) {
      await this.waitForServerReady();
    }

    const { type, id } = request;

    try {
      let url = `http://localhost:${this.currentPort}/`;
      switch (type) {
        case 'requestProjectGraph':
          url += 'project-graph.json';
          break;
        case 'requestTaskGraph':
          url += 'task-graph.json';
          break;
        case 'requestExpandedTaskInputs':
          url += `task-inputs.json?taskId=${request.payload}`;
          break;
        case 'requestSourceMaps':
          url += 'source-maps.json';
          break;
        default:
          return;
      }

      const headers = { 'Accept-Encoding': 'gzip, deflate' };
      const response = await xhr({
        url,
        headers,
      });
      const data = response.responseText;
      return {
        type: `${type}Response`,
        id,
        payload: data,
      };
    } catch (error) {
      console.error('Error handling request:', error);
      return;
    }
  }

  /**
   * starts nx graph server
   */
  async start() {
    console.log('starting graph server, isStarting:', this.isStarting);
    if (this.isStarting) {
      return;
    }
    this.isStarted = false;
    this.isStarting = false;
    let port = this.startPort;

    let isPortAvailable = false;
    while (!isPortAvailable) {
      isPortAvailable = await this.checkPort(port);
      if (!isPortAvailable) {
        port++;
      }
    }

    this.currentPort = port;
    try {
      console.log('spawning process at', port);
      const started = await this.spawnProcess(port);
      if (started) {
        this.isStarted = true;
      } else {
        console.log('couldnt start graph server');
      }
      this.isStarting = false;
    } catch (error) {
      console.error(`error while starting nx graph: ${error}`);
      this.isStarting = false;
    }
  }

  private get isCrashed() {
    return !!this.nxGraphProcess && !!this.nxGraphProcess.exitCode;
  }

  private async spawnProcess(port: number): Promise<boolean> {
    console.log('trying to start graph at', port);
    const workspacePath = await getNxWorkspacePath();
    console.log('workspacePath', workspacePath);

    return new Promise((resolve) => {
      const nxGraphProcess = spawn(
        getPackageManagerCommand().exec,
        [
          'nx',
          'graph',
          `--port`,
          `${port}`,
          '--open',
          'false',
          '--watch',
          this.affected ? '--affected' : '',
        ],
        {
          cwd: workspacePath,
          windowsHide: true,
          shell: true,
          env: process.env,
        }
      );

      nxGraphProcess.stdout.setEncoding('utf8');
      nxGraphProcess.stderr.setEncoding('utf8');

      nxGraphProcess.stdout.on('data', (data) => {
        const text: string = data.toString().trim().toLowerCase();

        if (!text) return;
        if (text.includes(`${port}`)) {
          resolve(true);
          return;
        }
        if (text.includes('updated')) {
          this.updatedEventEmitter.fire(true);
        } else {
          console.log('got text', text);
        }
      });
      nxGraphProcess.stderr.on('data', (data) => {
        console.log('err data', data.toString());
        resolve(false);
      });
      nxGraphProcess.on('exit', () => {
        console.log('on exit');
        resolve(false);
      });

      this.nxGraphProcess = nxGraphProcess;
    });
  }

  private checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();

      server.listen(port, '127.0.0.1');
      server.on('listening', () => {
        server.close();
        resolve(true);
      });

      server.on('error', () => {
        resolve(false);
      });
    });
  }

  private waitForServerReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        if (this.isStarted) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  dispose() {
    this.nxGraphProcess?.kill();
    this.nxGraphProcess = undefined;
  }
}
