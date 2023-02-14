import { Injectable } from '@angular/core';
import {
  Option,
  OptionType,
  TaskExecutionInputMessage,
  TaskExecutionInputMessageType,
  TaskExecutionOutputMessage,
  TaskExecutionSchema,
} from '@nx-console/shared/schema';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import type { WebviewApi } from 'vscode-webview';

declare global {
  interface Window {
    intellijApi?: {
      postToWebview: (message: string) => void;
      postToIde: (message: string) => void;
      registerPostToWebviewCallback: (
        callback: (message: TaskExecutionInputMessage) => void
      ) => void;
      registerPostToIdeCallback: (callback: (message: string) => void) => void;
    };
  }
}
@Injectable({
  providedIn: 'root',
})
export class IdeCommunicationService {
  private postToIde: (message: unknown) => void;

  private taskExecutionSchemaSubject: ReplaySubject<TaskExecutionSchema> =
    new ReplaySubject();
  taskExecutionSchema$ = this.taskExecutionSchemaSubject.asObservable();

  private enableTaskExecutionDryRunOnChangeSubject: BehaviorSubject<boolean> =
    new BehaviorSubject(true);
  enableTaskExecutionDryRunOnChange$ =
    this.enableTaskExecutionDryRunOnChangeSubject.asObservable();

  ide: 'vscode' | 'intellij';

  constructor() {
    let vscode: WebviewApi<undefined> | undefined;
    try {
      vscode = acquireVsCodeApi();
    } catch (e) {
      // noop
    }

    this.ide = vscode ? 'vscode' : 'intellij';
    console.log('initializing ide communication for', this.ide);

    if (vscode) {
      this.setupVscodeCommunication(vscode);
    } else {
      this.setupIntellijCommunication();
    }
  }

  postMessageToIde(message: TaskExecutionOutputMessage) {
    this.postToIde(message);
  }

  private setupVscodeCommunication(vscode: WebviewApi<undefined>) {
    window.addEventListener(
      'message',
      (event: MessageEvent<TaskExecutionInputMessage>) => {
        const data = event.data;
        if (!data) {
          return;
        }
        console.log('received message from vscode', data);

        this.handleTaskExecutionMessage(data);
      }
    );

    this.postToIde = (message) => vscode.postMessage(message);
  }

  private setupIntellijCommunication() {
    window.intellijApi?.registerPostToWebviewCallback(
      (message: TaskExecutionInputMessage) => {
        if (message.type === 'style') {
          const styleSheet = new CSSStyleSheet();
          styleSheet.replaceSync(`
          :root {
            --highlight-text-color: ${message.payload.highlightTextColor};
            --secondary-text-color: ${message.payload.secondaryTextColor};
            --background-color: ${message.payload.backgroundColor};
            --text-input-background-color: ${message.payload.fieldBackground};
            --text-input-border-color: ${message.payload.secondaryTextColor};
            --checkbox-background-color: ${message.payload.fieldBackground};
            --checkbox-border-color: ${message.payload.secondaryTextColor};
            --dropdown-input-background-color: ${message.payload.fieldBackground};
            --dropdown-input-border-color: ${message.payload.secondaryTextColor};
            --font-family: ${message.payload.fontFamily};
            --button-secondary-color: ${message.payload.fieldBackground};
          }
          `);
          document.adoptedStyleSheets = [styleSheet];
          return;
        }

        this.handleTaskExecutionMessage(message);
      }
    );

    this.postToIde = (message) => {
      const stringified = JSON.stringify(message);
      window.intellijApi?.postToIde(stringified);
    };
  }

  private handleTaskExecutionMessage(message: TaskExecutionInputMessage) {
    // TODO(cammisuli): Allow the UI to support array properties
    const optionFilter = (option: Option) =>
      !(
        option.type === OptionType.Array &&
        option.items &&
        (option.items as string[]).length === 0
      ) && option['x-priority'] !== 'internal';

    switch (message.type) {
      case TaskExecutionInputMessageType.SetTaskExecutionSchema: {
        const schema = message.payload;
        this.taskExecutionSchemaSubject.next({
          ...schema,
          options: schema.options.filter(optionFilter),
        });
        break;
      }

      case TaskExecutionInputMessageType.SetGlobalConfiguration: {
        this.enableTaskExecutionDryRunOnChangeSubject.next(
          message.payload.enableTaskExecutionDryRunOnChange
        );
        break;
      }
    }
  }
}
