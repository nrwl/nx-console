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
import { assign, createActor, emit, fromPromise, sendTo, setup } from 'xstate';

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

            try {
              const requestResult = await this.client.sendRequest(
                input.requestType,
                input.params
              );
              emit({
                type: 'requestResult',
                result: requestResult,
                number: input.number,
              });
            } catch (e) {
              return {
                type: 'requestResult',
                error: e,
                number: input.number,
              };
            }
          }
        ),
      },
      guards: {
        hasPendingRequests: ({ context }) => context.requests.length > 0,
      },
    }).createMachine({
      /** @xstate-layout N4IgpgJg5mDOIC5QDsAeAbWBhdBLMyALgMQDKAogHIAiA+gErkCKAquaQCoDaADALqJQABwD2sXIVwjkgkKkQBWABwB2AHQBOJRoBsARgBMAZhWmFBvQBoQAT0SGAvg+tpMOfETW4I6MGQ4AgvTc-LKi4pLSsvIICnrqRgAsBgo8BomJSnpGBjrWdrE5ahkGBlk6Ktk6BhpOLhjYeASEarCEAIYATpLIUMQQ0mBeyABuIgDWQ66NHi1tXT1QCLijIgDG7ZHIvHw7YWISUjJIcogaRhpqpTrVBqY8eqoG+YiJRkpqOok8CokqFZVVLVnCBpu5mq0Ot0Vn0wJ1OiJOmohOhNgAzREAWzUYKannm0N6y1WGy2Oz2J3ChyiJxiCn0xR4SRUSiZWi+SheCCMRj0ah+WVUFyM+lUdVBDXBnk6AFdkMgYf1BsMxpMcZK8S1ZfKYcSxqSjuTQpSDltovZDDpGXo9NUKra7okubzLnpEgoVHEFLzLSpxbjZmptQresQ4QikSj0Vj1W5NUG5SGlit9ZtDfwKcJTUdzQgbbliio7qK7baudc1NolBc9BpEjcbiz-RrA8HFZwAPIABUzICpZtp9h4PEuKg0Gnp6R42gnVlsiAsCjUbsyCnpiQ0xkyfpBAYhbdDvf7OcHeZtH2ZKiMDwed03XMefI9rI0ZnO52SzbjgbaIiEQkVAZkCGFMJimFsIV-f9dVAg1pCNAQTQiE9QBiFIrTKd5vhqP4ahULlkg+esND0Hg3jSFQ0hFL8Zkgwg-wA0Nw0RZFUUIDFOmxPd8Xo6CiVgtN4IzY0s2QmlUIXekrmrJRsLrItX2dEUrgsCpFx5VkdCcXcRAgOBZG4wh9jE44JIQABaOcCjrK41wMMj3VMG0JxoqUWm8XxjOpUzTgQZJ1CUBQP2qJRqjreICOSNQgtfUotFyHQeB3epvzohYYS8gczJUN5l1fXQgt+EwvgI7JK3OG1KrXUKdCMVz4wPKBMpQ3zKoMaLiIqfQyKUXJSqtYVKptaqbjq3cIJ4hiMqQ7zcz+AimUrHQsjicdeWW91tIcIA */
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
              actions: ['deleteFirstRequest'],
              reenter: true,
            },
            onError: {
              target: 'running',
              actions: ['deleteFirstRequest'],
              reenter: true,
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
    const number = this.requestsNumber++;
    this.actor.send({
      type: 'SEND_REQUEST',
      number: number,
      requestType,
      params,
    });
    return new Promise((resolve, reject) => {
      const subscription = this.actor.on('requestResult', (event: any) => {
        if (event.number !== number) {
          return;
        }
        subscription.unsubscribe();

        if (event.error) {
          reject(event.error);
        }
        resolve(event.result);
      });
    });
  }
}
