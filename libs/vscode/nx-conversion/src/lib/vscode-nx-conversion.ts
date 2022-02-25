import { getShellExecutionForConfig, getTelemetry } from '@nx-console/server';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { pipe, Subject } from 'rxjs';
import { filter, scan, tap } from 'rxjs/operators';
import { ExtensionContext, Task, tasks, TaskScope, window } from 'vscode';

const PROMPT_COUNT = 5;
const PROMPT_MSG = 'Convert to Nx?';

/**
 * Singleton class for helping with Nx Conversion.
 *
 * Get instances with `NxConversion.instance`
 */
export class NxConversion {
  private static _instance: NxConversion;
  public static get instance(): NxConversion {
    if (!NxConversion._instance) {
      throw 'NxConversion not created yet, please create an instance first with `NxConversion.createInstance(context)`';
    }
    return NxConversion._instance;
  }
  private static set instance(value: NxConversion) {
    if (NxConversion._instance) {
      console.warn(
        'NxConversion already created, are you sure you want to create another instance?'
      );
    }

    NxConversion._instance = value;
  }

  private _listener = new Subject<string>();

  private constructor(private _context: ExtensionContext) {
    const initialSeed = WorkspaceConfigurationStore.instance.get(
      'nxConversionCount',
      0
    );

    this._listener
      .pipe(shouldPromptForConversion(initialSeed))
      .subscribe(async (count) => {
        getTelemetry().screenViewed('Convert to Nx');

        const options = ['Yes', 'No'];
        if (count >= PROMPT_COUNT * 2) {
          options.push(`Don't ask again`);
        }

        const answer = await window.showInformationMessage(
          PROMPT_MSG,
          ...options
        );

        if (answer === undefined) {
          return;
        }

        if (answer === 'Yes') {
          getTelemetry().featureUsed('makeNgFaster');
          makeNgFaster();
        } else if (answer === 'No') {
          getTelemetry().featureUsed('do-not makeNgFaster');
        } else {
          WorkspaceConfigurationStore.instance.set(
            'nxConversionDoNotAskAgain',
            true
          );
          getTelemetry().featureUsed('do-not-ask-again makeNgFaster');
        }
      });
  }

  static createInstance(context: ExtensionContext) {
    NxConversion.instance = new NxConversion(context);
    return NxConversion.instance;
  }

  async trackEvent(eventName: string) {
    this._listener.next(eventName);
  }
}

function makeNgFaster() {
  tasks.executeTask(createMakeNgFasterTask());
}

function createMakeNgFasterTask() {
  const workspacePath = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );
  const displayCommand = 'make-angular-cli-faster';
  const task = new Task(
    {
      type: 'nx',
    },
    TaskScope.Workspace,
    displayCommand,
    'nx',
    getShellExecutionForConfig({
      cwd: workspacePath,
      displayCommand,
    })
  );
  return task;
}

function shouldPromptForConversion(initialSeed: number) {
  return pipe(
    scan((acc) => acc + 1, initialSeed),
    tap((value) => {
      WorkspaceConfigurationStore.instance.set('nxConversionCount', value);
    }),
    filter((count) => count % PROMPT_COUNT === 0),
    filter(() => {
      return (
        (WorkspaceConfigurationStore.instance.get(
          'workspaceType',
          ''
        ) as string) === 'angular' &&
        !WorkspaceConfigurationStore.instance.get(
          'nxConversionDoNotAskAgain',
          false
        )
      );
    })
  );
}
