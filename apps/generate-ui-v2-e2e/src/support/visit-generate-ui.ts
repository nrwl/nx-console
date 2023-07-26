import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';

export const visitGenerateUi = (schema: GeneratorSchema) =>
  cy.visit('/', {
    onBeforeLoad: (win: any) => {
      const postToWebviewCallbacks: any[] = [];
      win.intellijApi = {
        postToWebview(message: string) {
          console.log('posting message to webview', message);
          postToWebviewCallbacks.forEach((callback) => callback(message));
        },
        postToIde(message: string) {
          const messageParsed = JSON.parse(message);
          console.log('received', messageParsed);
          if (messageParsed.payloadType === 'output-init') {
            win.intellijApi?.postToWebview({
              payloadType: 'generator',
              payload: schema,
            });
          }
          if (messageParsed.payloadType === 'request-validation') {
            win.intellijApi?.postToWebview({
              payloadType: 'validation-results',
              payload: {},
            });
          }
          if (messageParsed.payloadType === 'copy-to-clipboard') {
            win.navigator.clipboard.writeText(messageParsed.payload);
          }
        },
        registerPostToWebviewCallback(callback: any) {
          postToWebviewCallbacks.push(callback);
        },
      };
    },
  });
