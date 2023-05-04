import type { GenerateUiInputMessage } from '@nx-console/shared/generate-ui-types';

declare global {
  interface Window {
    intellijApi?: {
      postToWebview: (message: string) => void;
      postToIde: (message: string) => void;
      registerPostToWebviewCallback: (
        callback: (message: GenerateUiInputMessage) => void
      ) => void;
      registerPostToIdeCallback: (callback: (message: string) => void) => void;
    };
  }
}
