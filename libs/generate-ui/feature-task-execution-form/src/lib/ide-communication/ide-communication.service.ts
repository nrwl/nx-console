import { Injectable } from '@angular/core';
import {
  Option,
  OptionType,
  TaskExecutionInputMessage,
  TaskExecutionInputMessageType,
  TaskExecutionSchema,
} from '@nx-console/shared/schema';
import { Subject } from 'rxjs';
import type { WebviewApi } from 'vscode-webview';

@Injectable({
  providedIn: 'root',
})
export class IdeCommunicationService {
  private postToIde: (message: unknown) => void;

  private taskExecutionSchemaSubject: Subject<TaskExecutionSchema> =
    new Subject();
  taskExecutionSchema$ = this.taskExecutionSchemaSubject.asObservable();

  private enableTaskExecutionDryRunOnChangeSubject: Subject<boolean> =
    new Subject();
  enableTaskExecutionDryRunOnChange$ =
    this.enableTaskExecutionDryRunOnChangeSubject.asObservable();

  constructor() {
    let vscode: WebviewApi<undefined> | undefined;
    try {
      vscode = acquireVsCodeApi();
    } catch (e) {
      // noop
    }

    if (vscode) {
      this.setupVscodeCommunication(vscode);
    } else {
      this.postToIde = (message) => {
        throw new Error('non-vscode ides not supported yet' + message);
      };
    }
  }

  postMessage(message: unknown) {
    this.postToIde(message);
  }

  private setupVscodeCommunication(vscode: WebviewApi<undefined>) {
    // TODO(cammisuli): Allow the UI to support array properties
    const optionFilter = (option: Option) =>
      !(
        option.type === OptionType.Array &&
        option.items &&
        (option.items as string[]).length === 0
      );
    window.addEventListener(
      'message',
      (event: MessageEvent<TaskExecutionInputMessage>) => {
        const data = event.data;

        switch (data.type) {
          case TaskExecutionInputMessageType.SetTaskExecutionSchema: {
            const schema = data.payload;
            this.taskExecutionSchemaSubject.next({
              ...schema,
              options: schema.options.filter(optionFilter),
            });
            break;
          }

          case TaskExecutionInputMessageType.SetGlobalConfiguration: {
            this.enableTaskExecutionDryRunOnChangeSubject.next(
              data.payload.enableTaskExecutionDryRunOnChange
            );
            break;
          }
        }
      }
    );

    this.postToIde = (message) => vscode.postMessage(message);
  }
}
