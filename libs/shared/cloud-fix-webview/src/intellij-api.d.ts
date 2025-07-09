import type { NxCloudFixInputMessage } from './types';

declare global {
  interface Window {
    intellijApi?: {
      postToWebview: (message: string) => void;
      postToIde: (message: string) => void;
      registerPostToWebviewCallback: (
        callback: (message: NxCloudFixInputMessage) => void,
      ) => void;
      registerPostToIdeCallback: (callback: (message: string) => void) => void;
    };
  }
}
