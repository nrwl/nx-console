import { NxChangeWorkspace } from '@nx-console/language-server/types';
import { getNxlsOutputChannel } from '@nx-console/vscode/output-channels';
import { join } from 'path';
import { ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  NotificationType,
  RequestType,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import {
  assign,
  createActor,
  emit,
  fromPromise,
  sendTo,
  setup,
  waitFor,
} from 'xstate';

let _nxlsClient: NewNxlsClient | undefined;

export function createNewNxlsClient(extensionContext: ExtensionContext) {
  _nxlsClient = new NewNxlsClient(extensionContext);
}

export function getNewNxlsClient(): NewNxlsClient {
  if (!_nxlsClient) {
    throw new Error('NxlsClient is not initialized');
  }
  return _nxlsClient;
}

export class NewNxlsClient {
  private client: LanguageClient | undefined;
  private requestsNumber = 0;

  constructor(private extensionContext: ExtensionContext) {}

  private actor = createActor(
    setup({
      types: {
        context: {} as {
          workspacePath: string | undefined;
          error: string | undefined;
          requests: {
            number: number;
            requestType: RequestType<unknown, unknown, unknown>;
            params: unknown;
          }[];
        },
      },
      actions: {
        assignWorkspacePath: assign(({ context, event }) => ({
          ...context,
          workspacePath: event.value,
        })),
        assignError: assign(({ context, event }) => ({
          ...context,
          error: event.error,
        })),
      },
      actors: {
        startClient: fromPromise(
          async ({
            input,
          }: {
            input: { workspacePath: string | undefined };
          }) => {
            return await this._start(input.workspacePath);
          }
        ),
        stopClient: fromPromise(async () => {
          return await this.stop();
        }),
      },
      guards: {
        hasPendingRequests: ({ context }) => context.requests.length > 0,
      },
    }).createMachine({
      /** @xstate-layout N4IgpgJg5mDOIC5QDsAeAbWBhdBLMyALgHS4TpgDEAygCoCCASrQNoAMAuoqAA4D2sXIVx9k3EKkQA2AKxtiATgAsMgEwK2UgMwyFU1TIA0IAJ6ItbeTJlL1WgBwXbqnQF9XxtJhz4ipclTUAKK0APoA6gDyjADS1AAK9FhBoYm0ABLsXEgg-ILCouKSCEoAjADsxPa6WmU2CqVKWqrGZiWl8lqNzVpasqpSSkPunhjYeAQksIQAhgBOwshQlBCiYKTIAG58ANbrXuO+U7MLuEsIZ9sAxjMFyFlZ4nlCImI5xR32UsRKbB2lgzYMik9i+rXMqkqkIUwNqDVKFjYWhGIAOPkmxGm80WyzAczmfDmxB46FuADNCQBbYhoiZ+LGnc6XPg3O4PThPAQvQrvaRfYi9GoyLTlJHlcrghCqNj2AWaBr2GGlBT2JQo2lHTEnHE0EIRaJxRLJVL0DKPHLPO5FRDVLQC0oyDoKDSO+ylUqSsqdbouPpqQZqjyosbovxzACuyGQZ2WdEi8XNvC5Vt5CHdwMU5QcUksWeVSklboFqnUJfsqk+MnK9nVIbpJAjUZjurCUViCSSKTSmQ5FuTr2taYMSmI5QrkMGoJzqnsno69qaMlBwuq4tr3nrWr4PB4zdWyHWzL2NLrmum293TK2LNur3Z2ST+QHqYMpWIM4ctikk90SikkrsTNvzYIYuhVGVkSDDUMXPHdmzxAkiRJckqRPDcz0IC8Ywua9WTvThE1yfseVAYpX3fRxVQGH9lH-UxEGlN8xwVKQ9DHCwpHXQ4YMwuClhbfV2yNLtTR7B8iKfEiJAY1RiF0RUVy+LN7HKBE529JolHLNgx3KBRyhkdwoL4CA4HEaCiE5SS3lIxAAFoDB+P4QKkd1mlcmcJXohA7O+Sx-ICgLGi40MSDICgrO5GzpJKBRZKrZQOlcpQ4rHSUuhkAVrBShEVKGVUQs3BkcUilNbIQFS31VEUbFKAx9LYBR0rYeLmjq-prFYwrNUbaMllK59yoRAEBTdLREuqbQvLaZpZSaUUGhsL4VT0bqeKw-q+2swdbAA1iBQM1SxtYlxDKMoA */
      id: 'nxlsClient',
      initial: 'idle',
      context: {
        workspacePath: undefined,
        error: undefined,
        requests: [],
      },
      states: {
        idle: {
          on: {
            START: {
              target: 'starting',
              actions: ['assignWorkspacePath'],
            },
            SET_WORKSPACE_PATH: {
              actions: ['assignWorkspacePath'],
            },
          },
        },
        starting: {
          invoke: {
            src: 'startClient',
            input: ({ context }) => ({ workspacePath: context.workspacePath }),
            onDone: {
              target: 'running',
            },
            onError: {
              target: 'idle',
              actions: ['assignError'],
            },
          },
          on: {
            SET_WORKSPACE_PATH: {
              actions: ['assignWorkspacePath'],
            },
          },
        },
        running: {
          on: {
            STOP: {
              target: 'stopping',
            },
            SET_WORKSPACE_PATH: {
              actions: [() => this.sendNotification(NxChangeWorkspace)],
            },
          },
        },
        stopping: {
          invoke: {
            src: 'stopClient',
            onDone: {
              target: 'idle',
              actions: ['assignError'],
            },
            onError: {
              target: 'idle',
              actions: ['assignError'],
            },
          },
          on: {
            SET_WORKSPACE_PATH: {
              actions: ['assignWorkspacePath'],
            },
          },
        },
      },
    })
  );

  public start(workspacePath: string) {
    this.actor.send({ type: 'START', value: workspacePath });
  }

  public setWorkspacePath(workspacePath: string) {}

  private async _start(workspacePath: string | undefined) {
    if (!workspacePath) {
      throw new Error('Workspace path is required to start the client');
    }
    const serverModule = this.extensionContext.asAbsolutePath(
      join('nxls', 'main.js')
    );

    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
    const serverOptions: ServerOptions = {
      run: {
        module: serverModule,
        transport: TransportKind.ipc,
      },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: debugOptions,
      },
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
      // Register the server for plain text documents
      initializationOptions: {
        workspacePath,
      },
      documentSelector: [
        { scheme: 'file', language: 'json', pattern: '**/nx.json' },
        { scheme: 'file', language: 'json', pattern: '**/project.json' },
        { scheme: 'file', language: 'json', pattern: '**/workspace.json' },
        { scheme: 'file', language: 'json', pattern: '**/package.json' },
      ],
      synchronize: {},
      outputChannel: getNxlsOutputChannel(),
      outputChannelName: 'Nx Language Server',
    };

    this.client = new LanguageClient(
      'NxConsoleClient',
      getNxlsOutputChannel().name,
      serverOptions,
      clientOptions
    );

    await this.client.start();
  }

  private async stop() {
    if (this.client) {
      await this.client.stop(2000);
    }
  }
  public async sendRequest<P, R, E>(
    requestType: RequestType<P, R, E>,
    params: P
  ): Promise<R | undefined> {
    await waitFor(this.actor, (snapshot) => snapshot.matches('running'));
    if (!this.client) {
      throw new NxlsClientNotInitializedError();
    }
    return await this.client.sendRequest(requestType, params);
  }
  public sendNotification<P>(
    notificationType: NotificationType<P>,
    params?: P
  ) {
    if (!this.client) {
      throw new NxlsClientNotInitializedError();
    }
    this.client.sendNotification(notificationType, params);
  }
}

export class NxlsClientNotInitializedError extends Error {
  constructor() {
    super('Nxls Client not initialized. This should not happen.');
    this.name = 'NxlsClientNotInitializedError';
  }
}
