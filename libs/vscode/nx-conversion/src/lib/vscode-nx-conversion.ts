import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import {
  getTelemetry,
  getShellExecutionForConfig,
} from '@nx-console/vscode/utils';
import { pipe, Subject } from 'rxjs';
import { filter, scan, tap } from 'rxjs/operators';
import {
  commands,
  ExtensionContext,
  ExtensionMode,
  Task,
  tasks,
  TaskScope,
  window,
} from 'vscode';

/**
 * The amount of times the user should run commands before a prompt is shown.
 *
 * DevelopmentMode will change this to `1`.
 */
const PROMPT_COUNT = 5;
const PROMPT_MSG =
  'Would you like to make ng commands faster by adding computation caching? [Learn more here](https://nx.dev/migration/migration-angular?utm_source=vscode-nx-conversion&utm_medium=prompt&utm_campaign=vscode-nx-conversioni#from-nx-console)';
const PROMPT_MSG_DONT_ASK_AGAIN =
  'If you change your mind, you can run the `make ng faster with Nx` command through the command palette.';

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
    } else {
      commands.registerCommand('nxConsole.makeNgFaster', makeNgFaster);
    }

    NxConversion._instance = value;
  }

  private _listener = new Subject<string>();

  private constructor(private _context: ExtensionContext) {
    const initialSeed = WorkspaceConfigurationStore.instance.get(
      'nxConversionCount',
      0
    );

    const promptCount =
      _context.extensionMode === ExtensionMode.Development ? 1 : PROMPT_COUNT;

    this._listener
      .pipe(shouldPromptForConversion(initialSeed, promptCount, _context))
      .subscribe(async (count) => {
        makeNgFaster(count);
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

async function makeNgFaster(count = 0) {
  getTelemetry().screenViewed('Convert to Nx');

  const options = ['Yes', 'No'];
  if (count >= PROMPT_COUNT * 2) {
    options.push(`Don't ask again`);
  }

  const answer = await window.showInformationMessage(PROMPT_MSG, ...options);

  if (answer === undefined) {
    return;
  }

  if (answer === 'Yes') {
    getTelemetry().screenViewed('Convert to Nx - Yes');
    getTelemetry().featureUsed('makeNgFaster');
    tasks.executeTask(createMakeNgFasterTask());
  } else if (answer === 'No') {
    getTelemetry().screenViewed('Convert to Nx - No ');
    getTelemetry().featureUsed('do-not makeNgFaster');
  } else {
    WorkspaceConfigurationStore.instance.set('nxConversionDoNotAskAgain', true);
    getTelemetry().featureUsed('do-not-ask-again makeNgFaster');
    window.showInformationMessage(PROMPT_MSG_DONT_ASK_AGAIN);
  }
}

function createMakeNgFasterTask() {
  const workspacePath = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );
  const displayCommand = 'nx init';
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
      standaloneNx: false,
    })
  );
  return task;
}

function shouldPromptForConversion(
  initialSeed: number,
  promptCount: number,
  _context: ExtensionContext
) {
  const askAgain: boolean =
    !WorkspaceConfigurationStore.instance.get(
      'nxConversionDoNotAskAgain',
      false
    ) || _context.extensionMode === ExtensionMode.Development;

  return pipe(
    scan((acc) => acc + 1, initialSeed),
    tap((value) => {
      WorkspaceConfigurationStore.instance.set('nxConversionCount', value);
    }),
    filter((count) => count % promptCount === 0),
    filter(
      () =>
        askAgain &&
        (WorkspaceConfigurationStore.instance.get(
          'workspaceType',
          ''
        ) as string) === 'angular'
    )
  );
}
