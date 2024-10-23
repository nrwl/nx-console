import { getNxlsOutputChannel } from '@nx-console/vscode/output-channels';
import { join } from 'path';
import { ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  RequestType,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { assign, createActor, fromPromise, sendTo, setup } from 'xstate';

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
        assignWorkspaceContext: assign(({ context, event }) => ({
          ...context,
          workspacePath: event.value,
        })),
        assignError: assign(({ context, event }) => ({
          ...context,
          error: event.error,
        })),
        addRequestToQueue: assign(({ context, event }) => ({
          ...context,
          requests: context.requests.concat({
            number: event.number,
            requestType: event.requestType,
            params: event.params,
          }),
        })),
        deleteFirstRequest: assign(({ context }) => ({
          ...context,
          requests: context.requests.slice(1),
        })),
      },
      actors: {
        startClient: fromPromise(
          async ({
            input,
          }: {
            input: { workspacePath: string | undefined };
          }) => {
            return await this.start(input.workspacePath);
          }
        ),
        stopClient: fromPromise(async () => {
          return await this.stop();
        }),
        sendRequest: fromPromise(
          async ({
            input,
          }: {
            input: {
              number: number;
              requestType: RequestType<unknown, unknown, unknown>;
              params: unknown;
            };
          }) => {
            if (!this.client) {
              throw new Error('Client is not initialized');
            }

            return await this.client.sendRequest(
              input.requestType,
              input.params
            );
          }
        ),
      },
      guards: {
        hasPendingRequests: ({ context }) => context.requests.length > 0,
      },
    }).createMachine({
      /** @xstate-layout N4IgpgJg5mDOIC5QDsAeAbWBhdBLMyALgMQDKAogHIAiA+gErkCKAquaQCoDaADALqJQABwD2sXIVwjkgkKkQBWABwB2AHQBOJRoBsAZh0qFKjQEZTegDQgAnolMAmAL5PraTDnxE1uCOjBkHACC9Nz8sqLiktKy8ggKpjpqCjwJGgoaPKZKDg5K1nYIehoALGoOeqYqKiUOKoYVPDoubhjYeASEarCEAIYATpLIUMQQ0mA+yABuIgDWE+7tXl09A0NQCLjTIgDGvdHIvHxHEWISUjJIcogaxeUOOgolNXr1PNUFiCWpau96SiUUqk8jpDC0QItPJ1un1BlsRmB+v0RP01EJ0PsAGYogC2akhHW8qzhw022z2ByOJyukXOMSucWMpnK2RUejqmWKPCstkQeiymgBehKehS+iUynBBOWan6AFdkMh4aNxpMZvN8W0od55Yr4WSZhSLlTwjSzgdYvZHElvuZhQ4FAodFoeYU9JVfg5ssKdFUlIYqlKtYSurqlcNAgB5AAK1OE5ouloQph4PA0ahMpW+CWyFg0n2TSmZxiLPH9zu5uhKQY8IdlCvDIzjIFpFoZVuyamF1WeTpK+luBbyCgzWUdDh4-Z4DmeNaW0J6IiEQmVY2QEy26oWwZli+X+s3u32xv4zdbifbCAdSTy-ye+n7GkHvKKpU00+z2S0KnMzVcEJ3BdCCXFcI0RZFUXRLFcU1Wtd2A-dSUPI1pBNAQzSiC9QDia9yiUO9+x9J9XT5ac1EeEoNBqEpTHSd0NBcf9kBECA4FkaVOlOTD6WwxAAFpTALN8HQUXJEluGdKIUOdtS6Xx-C4ulLl4hBanUCVbhUJRUyqEoAQLb5025fkdAeRIvWqGS62JdZFLbFSXjUWitN0JRtBFHR8hff4eC7B4EndZ1HmyKyZTDeE7Kw65k3MBxkkfTzTNZEiihyNQcmCwLdASJRQqAkCIowpSk2eAtXl8-lTCdGdPKogFGKcIA */
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
              actions: ['assignWorkspaceContext'],
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
        },
        running: {
          invoke: {
            src: 'sendRequest',
            input: ({ context }) => ({
              number: context.requests[0].number,
              requestType: context.requests[0].requestType,
              params: context.requests[0].params,
            }),
            onDone: {
              target: 'running',
            },
          },
          on: {
            STOP: {
              target: 'stopping',
            },
          },
          always: {
            guard: 'hasPendingRequests',
            target: 'running',
            reenter: true,
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
        },
      },
      on: {
        SEND_REQUEST: {
          actions: ['addRequestToQueue'],
        },
      },
    })
  );

  private async start(workspacePath: string | undefined) {
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
    this.actor.send({
      type: 'SEND_REQUEST',
      number: this.requestsNumber++,
      requestType,
      params,
    });
    this.actor.subscribe();
    return;
  }
}
