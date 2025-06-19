import { CIPEInfo, CIPEInfoError } from '@nx-console/shared-types';
import { getPackageManagerCommand } from '@nx-console/shared-npm';
import {
  onWorkspaceRefreshed,
  showRefreshLoadingAtLocation,
} from '@nx-console/vscode-lsp-client';
import { getCloudOnboardingInfo } from '@nx-console/vscode-nx-workspace';
import {
  getNxlsOutputChannel,
  getOutputChannel,
} from '@nx-console/vscode-output-channels';
import { CliTaskProvider } from '@nx-console/vscode-tasks';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { getWorkspacePath } from '@nx-console/vscode-utils';
import {
  commands,
  ExtensionContext,
  ExtensionMode,
  ShellExecution,
  Task,
  TaskProcessEndEvent,
  tasks,
  TaskScope,
  window,
} from 'vscode';
import { createActor } from 'xstate';
import { compareCIPEDataAndSendNotification } from './cipe-notifications';
import { CloudOnboardingViewProvider } from './cloud-onboarding-view';
import { CloudRecentCIPEProvider } from './cloud-recent-cipe-view';
import { machine } from './cloud-view-state-machine';
import { TelemetryEventSource } from '@nx-console/shared-telemetry';
import { NxCloudFixWebview } from './nx-cloud-fix-webview';

export function initNxCloudView(context: ExtensionContext) {
  // set up state machine & listeners
  const actor = createActor(
    machine.provide({
      actions: {
        compareCIPEDataAndSendNotification: (
          _,
          params: {
            oldData: CIPEInfo[] | null;
            newData: CIPEInfo[];
          },
        ) => {
          compareCIPEDataAndSendNotification(params.oldData, params.newData);
        },
        setViewVisible: (_, params: { viewId: string }) => {
          setCloudViewContext(params.viewId);
        },
        setErrorContext: ({ context }) => {
          setCIPEErrorContext(context.cipeError?.type);
        },
      },
    }),
    {
      inspect: getStateMachineLogger(context),
      systemId: 'cloud-view',
    },
  ).start();
  CloudOnboardingViewProvider.create(context, actor);
  CloudRecentCIPEProvider.create(context, actor);
  NxCloudFixWebview.create(context, actor);

  async function updateOnboarding() {
    const onboardingInfo = await getCloudOnboardingInfo();
    actor.send({
      type: 'UPDATE_ONBOARDING',
      value: onboardingInfo,
    });
  }

  updateOnboarding();
  context.subscriptions.push(
    onWorkspaceRefreshed(async () => {
      updateOnboarding();
    }),
  );

  context.subscriptions.push(
    showRefreshLoadingAtLocation({ viewId: 'nxCloudLoading' }),
    showRefreshLoadingAtLocation({ viewId: 'nxCloudRecentCIPE' }),
    showRefreshLoadingAtLocation({ viewId: 'nxCloudOnboarding' }),
  );

  // register commands
  context.subscriptions.push(
    commands.registerCommand('nx.connectToCloud', async () => {
      runNxConnect('command');
    }),
    commands.registerCommand(
      'nxConsole.connectToCloud.welcomeView',
      async () => {
        runNxConnect('welcome-view');
      },
    ),
    commands.registerCommand('nxCloud.refresh', () => {
      actor.system.get('polling').send({ type: 'FORCE_POLL' });
      const loadingPromise = updateOnboarding().catch(() => {
        // ignore errors to make sure the loading state is cleaned up
        // errors will be shown in nxls logs already
      });
      window.withProgress(
        { location: { viewId: 'nxCloudLoading' } },
        async () => await loadingPromise,
      );
      window.withProgress(
        { location: { viewId: 'nxCloudRecentCIPE' } },
        async () => await loadingPromise,
      );
      window.withProgress(
        { location: { viewId: 'nxCloudOnboarding' } },
        async () => await loadingPromise,
      );
    }),
    commands.registerCommand('nxCloud.login', async () => {
      const workspacePath = getWorkspacePath();

      const pkgManagerCommands = await getPackageManagerCommand(workspacePath);

      const command = 'nx-cloud login';
      const task = new Task(
        { type: 'nx' },
        TaskScope.Workspace,
        command,
        'nx',
        new ShellExecution(`${pkgManagerCommands.dlx} ${command}`, {
          cwd: workspacePath,
          env: {
            ...process.env,
            NX_CONSOLE: 'true',
          },
        }),
      );
      task.presentationOptions.focus = true;

      tasks.executeTask(task);

      const subscription = tasks.onDidEndTaskProcess(
        (e: TaskProcessEndEvent) => {
          if (e.execution.task.name === command) {
            actor.system.get('polling').send({ type: 'FORCE_POLL' });
            subscription.dispose();
          }
        },
      );
    }),
    commands.registerCommand('nxCloud.viewRecentError', () => {
      const error = actor.getSnapshot().context.cipeError?.message;
      if (error) {
        const outputChannel = getOutputChannel();
        outputChannel.appendLine(`Nx Cloud Error: ${error}`);
        outputChannel.show();
      } else {
        getNxlsOutputChannel().show();
      }
    }),
  );
}

export function runNxConnect(source: TelemetryEventSource = 'command') {
  getTelemetry().logUsage('cloud.connect', {
    source,
  });
  CliTaskProvider.instance.executeTask({
    command: 'connect',
    flags: [],
  });
}

const getStateMachineLogger = (context: ExtensionContext) =>
  context.extensionMode === ExtensionMode.Production
    ? undefined
    : (event: any) => {
        const snapshot = event.actorRef.getSnapshot();
        if (
          event.type === '@xstate.snapshot' &&
          snapshot.value &&
          (event.actorRef as any)['_systemId'] === 'cloud-view'
        ) {
          getOutputChannel().appendLine(
            `Nx Cloud - ${JSON.stringify(snapshot.value)}`,
          );
        }
      };

function setCloudViewContext(viewId: string) {
  const availableViews = ['loading', 'onboarding', 'recent-cipe'];
  availableViews.forEach((view) => {
    if (view === viewId) {
      commands.executeCommand(
        'setContext',
        `nxCloudView.visible.${view}`,
        true,
      );
    } else {
      commands.executeCommand(
        'setContext',
        `nxCloudView.visible.${view}`,
        false,
      );
    }
  });
}

function setCIPEErrorContext(type: CIPEInfoError['type'] | undefined) {
  commands.executeCommand('setContext', 'nxCloudView.error', type ?? false);
}
