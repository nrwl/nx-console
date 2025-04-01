/**
 * Mock VSCode API for testing
 */
export function mockVsCodeApi(win: Window) {
  // Mock the VSCode API
  (win as any).acquireVsCodeApi = () => {
    const state = {};
    return {
      postMessage: (message: any) => {
        console.log('Message from webview to extension:', message);

        // Handle specific message types that need responses
        if (message.payloadType === 'output-init') {
          // Send a default generator schema
          win.dispatchEvent(
            new MessageEvent('message', {
              data: {
                payloadType: 'generator',
                payload: {
                  collectionName: '@nx/workspace',
                  generatorName: 'application',
                  options: [
                    {
                      name: 'name',
                      description: 'Application name',
                      type: 'string',
                      isRequired: true,
                    },
                    {
                      name: 'directory',
                      description: 'Directory where the application is placed',
                      type: 'string',
                      isRequired: false,
                    },
                  ],
                },
              },
            }),
          );

          // Send configuration
          win.dispatchEvent(
            new MessageEvent('message', {
              data: {
                payloadType: 'config',
                payload: {
                  enableTaskExecutionDryRunOnChange: false,
                },
              },
            }),
          );
        }

        // Handle validation requests
        if (message.payloadType === 'request-validation') {
          win.dispatchEvent(
            new MessageEvent('message', {
              data: {
                payloadType: 'validation-results',
                payload: {},
              },
            }),
          );
        }
      },
      getState: () => state,
      setState: (newState: any) => Object.assign(state, newState),
    };
  };
}
