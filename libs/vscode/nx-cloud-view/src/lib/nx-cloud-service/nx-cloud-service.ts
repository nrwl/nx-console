import { getPackageManagerCommand } from '@nrwl/devkit';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { EXECUTE_ARBITRARY_COMMAND } from '@nx-console/vscode/nx-commands-view';
import {
  getNxCloudRunnerUrl,
  getNxWorkspace,
} from '@nx-console/vscode/nx-workspace';
import {
  getTelemetry,
  getWorkspacePath,
  watchFile,
} from '@nx-console/vscode/utils';
import { exec, spawn } from 'child_process';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  lastValueFrom,
  Observable,
  switchMap,
  take,
} from 'rxjs';
import { coerce, gte, lt } from 'semver';
import { promisify } from 'util';
import {
  authentication,
  commands,
  ProgressLocation,
  tasks,
  window,
} from 'vscode';
import type { CloudConfig } from '../config';
import {
  CLAIM_COMMAND,
  INSPECT_RUN_COMMAND,
  LOGIN_AND_CLAIM_COMMAND,
  LOGIN_COMMAND,
  OPEN_WEBAPP_COMMAND,
  REFRESH_COMMAND,
  RUN_FIRST_COMMAND_COMMAND,
  SETUP_CLOUD_RUNNER_COMMAND,
  SETUP_VCS_COMMAND,
  SHOW_HELP_COMMAND,
  WebviewMessage,
} from './commands';
import type { RunDetails, VCSIntegrationStatusOptions } from './models';
import { NxCloudApiService } from './nx-cloud-api.service';
import { jsonCompare, StateBaseService } from './state-base-service';

type InternalState = {
  isUsingCloudRunner: boolean | undefined;
  cloudRunnerUrl: string | undefined;
  authAccessToken: string | undefined;
  canAccessCloudWorkspace: boolean | undefined;
  isCloudWorkspaceClaimed: boolean | undefined;
  runDetailsLoading: boolean;
  runDetails: RunDetails[] | undefined;
  cloudOrgs: { id: string; name: string }[];
  cloudWorkspaceId: string;
  cloudWorkspaceOrgId: string | undefined;
  runFirstCommandOptions: string[];
  serverError: string | undefined;
  vcsIntegrationStatus: VCSIntegrationStatusOptions | undefined;
};

const initialInternalState: InternalState = {
  isUsingCloudRunner: undefined,
  cloudRunnerUrl: undefined,
  authAccessToken: undefined,
  canAccessCloudWorkspace: undefined,
  isCloudWorkspaceClaimed: undefined,
  runDetailsLoading: false,
  runDetails: undefined,
  cloudOrgs: [],
  cloudWorkspaceId: '',
  cloudWorkspaceOrgId: undefined,
  runFirstCommandOptions: [],
  serverError: undefined,
  vcsIntegrationStatus: undefined,
};

// the state that is consumed by the webview, composed of internal state and some derived state
export type WebviewState = Pick<
  InternalState,
  | 'isUsingCloudRunner'
  | 'canAccessCloudWorkspace'
  | 'isCloudWorkspaceClaimed'
  | 'runDetailsLoading'
  | 'runDetails'
  | 'cloudOrgs'
  | 'runFirstCommandOptions'
  | 'serverError'
  | 'vcsIntegrationStatus'
> & {
  hasLoadedWorkspaceDetails: boolean;
  isUsingCloudRunnerLoading: boolean;
  isAuthenticated: boolean;
  isUsingPrivateCloud: boolean;
};

export class NxCloudService extends StateBaseService<InternalState> {
  private nxCloudApiService: NxCloudApiService;

  constructor(private config: CloudConfig) {
    super(initialInternalState);
    this.nxCloudApiService = new NxCloudApiService(config.endpoint);

    this.listenForNxJsonChanges();
    this.listenForWorkspaceDetails();
    this.listenForIsAuthenticated();

    this.loadUserDetailsOnAuthenticated();
    this.loadRunDetailsWhenWorkspaceDetailsAvailable();
    this.generateListOfFirstCommands();
    this.listenForVcsIntegrationStatus();
  }

  /**
   * Public API:
   * - state observable flowing out
   * - messages coming in
   */

  webviewState$: Observable<WebviewState> = this.select((state) => ({
    isUsingCloudRunner: state.isUsingCloudRunner,
    isUsingPrivateCloud:
      state.cloudRunnerUrl !== undefined &&
      state.cloudRunnerUrl !== 'http://staging.nx.app' &&
      state.cloudRunnerUrl !== 'https://cloud.nx.app',
    isUsingCloudRunnerLoading: state.isUsingCloudRunner === undefined,
    isAuthenticated: state.authAccessToken !== undefined,
    isCloudWorkspaceClaimed: state.isCloudWorkspaceClaimed,
    canAccessCloudWorkspace: state.canAccessCloudWorkspace,
    hasLoadedWorkspaceDetails: !(
      state.isCloudWorkspaceClaimed === undefined ||
      state.canAccessCloudWorkspace === undefined
    ),
    runDetailsLoading: state.runDetailsLoading,
    runDetails: state.runDetails,
    cloudOrgs: state.cloudOrgs,
    runFirstCommandOptions: state.runFirstCommandOptions,
    serverError: state.serverError,
    vcsIntegrationStatus: state.vcsIntegrationStatus,
  }));

  public handleMessage(message: WebviewMessage) {
    if (message.command === SETUP_CLOUD_RUNNER_COMMAND) {
      this.setupCloudRunner();
      return;
    }
    if (message.command === RUN_FIRST_COMMAND_COMMAND) {
      if (!message.commandString) {
        return;
      }
      this.runCommandAndRefresh(message.commandString);
    }
    if (message.command === LOGIN_COMMAND) {
      commands.executeCommand('nxConsole.loginToNxCloud');
      return;
    }
    if (message.command === LOGIN_AND_CLAIM_COMMAND) {
      this.loginAndClaim();
      return;
    }
    if (message.command === CLAIM_COMMAND) {
      this.selectOrgAndClaim();
      return;
    }
    if (message.command === SHOW_HELP_COMMAND) {
      if (!message.id) {
        return;
      }
      const linkMap: Record<string, string> = {
        'remote-cache':
          'https://nx.dev/core-features/share-your-cache?utm_source=nxconsole',
        dte: 'https://nx.dev/core-features/distribute-task-execution?utm_source=nxconsole',
        vcs: 'https://nx.dev/nx-cloud/set-up/github?utm_source=nxconsole',
      };
      commands.executeCommand('vscode.open', linkMap[message.id]);
    }
    if (message.command === REFRESH_COMMAND) {
      this.refresh();
    }
    if (message.command === INSPECT_RUN_COMMAND) {
      if (!message.runLinkId) {
        return;
      }
      this.openRunDetails(message.runLinkId);
    }
    if (message.command === SETUP_VCS_COMMAND) {
      this.setupVcsIntegration();
    }
    if (message.command === OPEN_WEBAPP_COMMAND) {
      this.openPrivateCloudWebapp();
    }
  }

  /*
   * Actions triggered by webview messages
   */

  private async setupCloudRunner() {
    getTelemetry().featureUsed('nxConsole.cloud.setupRunner');

    const isConnected = await this.isUsingCloudRunner();
    if (isConnected) {
      window.showInformationMessage('You are already connected to Nx Cloud');
      return;
    }

    const nxVersion = await WorkspaceConfigurationStore.instance.get(
      'nxVersion',
      'latest'
    );

    const env = { ...process.env, NX_CLOUD_API: this.config.appUrl };

    window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: 'Connecting you to Nx Cloud...',
      },
      () => {
        return new Promise((resolve) => {
          try {
            if (lt(coerce(nxVersion) ?? '', '12.0.0')) {
              promisify(exec)(
                `${
                  getPackageManagerCommand().addDev
                } @nrwl/nx-cloud@${nxVersion}`,
                { cwd: getWorkspacePath() }
              )
                .then(() => {
                  promisify(exec)(
                    `${
                      getPackageManagerCommand().exec
                    } nx g @nrwl/nx-cloud:init`,
                    { cwd: getWorkspacePath(), env }
                  ).then(() => resolve(true));
                })
                .catch((e) => {
                  window.showErrorMessage(e.message);
                  resolve(true);
                });
              return;
            }

            process.exit = function (code?: number) {
              console.log(
                'process.exit called with code (before spawn)' + code
              );
            } as (code?: number) => never;

            const commandProcess = spawn(
              getPackageManagerCommand().exec,
              [
                'nx',
                // https://github.com/nrwl/nx/pull/12942
                gte(coerce(nxVersion) ?? '', '15.0.7')
                  ? 'connect'
                  : 'connect-to-nx-cloud',
              ],
              { cwd: getWorkspacePath(), env, shell: true }
            );

            commandProcess.stdout.setEncoding('utf8');

            commandProcess.stdout.on('data', (data) => {
              if (data.includes('I want faster builds')) {
                commandProcess.stdin.write('yes\r\n', 'utf8');
              }
            });

            commandProcess.on('close', () => resolve(true));
          } catch (e) {
            window.showErrorMessage(e.message);
            resolve(true);
          }
        });
      }
    );
  }

  private async loginAndClaim() {
    commands.executeCommand('nxConsole.loginToNxCloud');
    const loggedIn = await new Promise((resolve) => {
      authentication
        .getSession('nxCloud', [], { createIfNone: false })
        .then((session) => {
          if (session) {
            resolve(true);
          }
        });

      authentication.onDidChangeSessions((e) => {
        if (e.provider.id === 'nxCloud') {
          resolve(true);
        }
      });

      setTimeout(() => {
        resolve(false);
      }, 60000);
    });

    if (!loggedIn) {
      window.showErrorMessage('Login timed out. Please try again.');
      return;
    }

    const selectedOrgId = await this.selectOrg();

    if (!selectedOrgId) {
      return;
    }

    this.claimCloudWorkspace(selectedOrgId);
  }

  private async selectOrgAndClaim() {
    const selectedOrgId = await this.selectOrg();

    if (!selectedOrgId) {
      return;
    }

    this.claimCloudWorkspace(selectedOrgId);
  }

  private async selectOrg(): Promise<string | undefined> {
    const cloudOrgs = await lastValueFrom(
      this.select((state) => state.cloudOrgs).pipe(
        filter((cloudOrgs) => cloudOrgs.length > 0),
        take(1)
      )
    );

    const selectedOrg = await window.showQuickPick(
      cloudOrgs.map((cloudOrg) => ({
        label: cloudOrg.name,
        id: cloudOrg.id,
      })),
      {
        title: 'Select an organization to associate this workspace with',
      }
    );

    return selectedOrg?.id;
  }

  private async claimCloudWorkspace(orgId: string) {
    try {
      const result = await this.nxCloudApiService.claimCloudWorkspace(orgId);
      if (result.connectWorkspaceUsingToken.result === 'success') {
        this.setState({
          isCloudWorkspaceClaimed: true,
          cloudWorkspaceId: result.connectWorkspaceUsingToken.workspaceId,
        });
        getTelemetry().featureUsed('nxConsole.cloud.claimWorkspace');

        return;
      }
      if (result.connectWorkspaceUsingToken.error) {
        window.showErrorMessage(result.connectWorkspaceUsingToken.error);
        return;
      }
    } catch (e) {
      window.showErrorMessage(
        'There was an error while claiming the workspace.'
      );
    }
  }

  private async runCommandAndRefresh(command?: string) {
    const refreshRuns = async () => {
      const cloudWorkspaceId = this.state.cloudWorkspaceId;
      if (!cloudWorkspaceId) {
        return;
      }
      this.setState({ runDetailsLoading: true });
      try {
        const runDetails = await this.nxCloudApiService.getRunDetails(
          cloudWorkspaceId
        );
        this.setState({ runDetails, runDetailsLoading: false });
      } catch (e) {
        window.showErrorMessage(`${e}`);
        this.setState({ runDetailsLoading: false });
      }
    };
    commands.executeCommand(EXECUTE_ARBITRARY_COMMAND, command);
    getTelemetry().featureUsed('nxConsole.cloud.runFirstCommand');

    const disposable = tasks.onDidEndTaskProcess((taskEndEvent) => {
      if (taskEndEvent.execution.task.definition.type === 'nx') {
        refreshRuns();
        disposable.dispose();
      }
    }, undefined);
  }

  private async openRunDetails(runLinkId: string) {
    const url = await this.getNxCloudBaseUrl();

    commands.executeCommand(
      'vscode.open',
      `${url}/runs/${runLinkId}?utm_source=nxconsole`
    );
    getTelemetry().featureUsed('nxConsole.cloud.viewRunDetails');
  }

  private async setupVcsIntegration() {
    if (!this.state.isCloudWorkspaceClaimed) {
      window.showErrorMessage(
        'You must claim your workspace before setting up VCS integration.'
      );
      return;
    }
    const orgId = this.state.cloudWorkspaceOrgId;
    const workspaceId = this.state.cloudWorkspaceId;
    const baseUrl = await getNxCloudRunnerUrl();

    const link = `${baseUrl}/orgs/${orgId}/workspaces/${workspaceId}/set-up-vcs-integration?utm_source=nxconsole`;

    commands.executeCommand('vscode.open', link);

    getTelemetry().featureUsed('nxConsole.cloud.setupVcs');
  }

  private openPrivateCloudWebapp() {
    const url = this.state.cloudRunnerUrl;
    if (!url) {
      return;
    }
    commands.executeCommand('vscode.open', url);
  }

  /*
   * Listeners that react to state or workspace changes and update the state
   */

  private listenForNxJsonChanges(): void {
    this.loadAndSetIsUsingCloudRunner();
    this.loadAndSetIsPrivateCloud();

    watchFile(`${getWorkspacePath()}/nx.json`, async () => {
      this.loadAndSetIsUsingCloudRunner(true);
      this.loadAndSetIsPrivateCloud();
    });
    this.refresh$.subscribe(() => {
      this.loadAndSetIsUsingCloudRunner(true);
      this.loadAndSetIsPrivateCloud();
    });
  }

  private async loadAndSetIsUsingCloudRunner(reset = false) {
    const isConnected = await this.isUsingCloudRunner(reset);
    this.setState({ isUsingCloudRunner: isConnected });
  }

  private async loadAndSetIsPrivateCloud() {
    const nxWorkspaceConfig = (await getNxWorkspace()).workspace;
    const cloudRunnerUrl =
      nxWorkspaceConfig.tasksRunnerOptions?.default?.runner === '@nrwl/nx-cloud'
        ? nxWorkspaceConfig.tasksRunnerOptions?.default?.options?.url
        : undefined;

    this.setState({ cloudRunnerUrl });
  }

  private async generateListOfFirstCommands(): Promise<void> {
    const generateAndSetFirstCommands = async () => {
      const nxConfig = (await getNxWorkspace()).workspace;
      const cacheableOperations =
        nxConfig.tasksRunnerOptions?.default?.options.cacheableOperations;
      const commands: string[] = [];
      // get cacheable operations from default project
      if (nxConfig.defaultProject && cacheableOperations) {
        Object.keys(
          nxConfig.projects[nxConfig.defaultProject]?.targets ?? {}
        ).forEach((targetName) => {
          if (cacheableOperations.includes(targetName)) {
            commands.push(`nx run ${nxConfig.defaultProject}:${targetName}`);
          }
        });
      }
      // get cacheable operations from other projects until you have three
      if (cacheableOperations && commands.length < 3) {
        for (const [projectName, projectConfig] of Object.entries(
          nxConfig.projects
        )) {
          for (const targetName of Object.keys(projectConfig.targets ?? {})) {
            if (cacheableOperations.includes(targetName)) {
              const operationName = `nx run ${projectName}:${targetName}`;
              if (!commands.includes(operationName)) {
                commands.push(operationName);
              }
            }
          }
          if (commands.length === 3) {
            break;
          }
        }
      }
      this.setState({ runFirstCommandOptions: commands.slice(0, 3) });
    };

    generateAndSetFirstCommands();
    this.refresh$.subscribe(() => {
      generateAndSetFirstCommands();
    });
  }

  private listenForWorkspaceDetails(): void {
    this.select((state) => ({
      isUsingCloudRunner: state.isUsingCloudRunner,
      isAuthenticated: state.authAccessToken,
      isClaimed: state.isCloudWorkspaceClaimed,
    }))
      .pipe(
        filter((partialState) => !!partialState.isUsingCloudRunner),
        debounceTime(500)
      )
      .subscribe(async () => {
        try {
          const result =
            await this.nxCloudApiService.getWorkspaceDetailsByToken();

          if (result.workspaceByToken.result === 'unauthorized') {
            this.setState({
              canAccessCloudWorkspace: false,
              // the only way we can't access a workspace is if it's claimed
              isCloudWorkspaceClaimed: true,
              serverError: undefined,
            });
            return;
          }
          if (result.workspaceByToken.result === 'not_found') {
            this.setState({
              serverError: 'not_found',
            });
            return;
          }

          this.setState({
            isCloudWorkspaceClaimed: result.workspaceByToken.workspace.claimed,
            cloudWorkspaceId: result.workspaceByToken.workspace.id,
            cloudWorkspaceOrgId: result.workspaceByToken.workspace.orgId,
            canAccessCloudWorkspace: true,
            serverError: undefined,
          });
        } catch (e) {
          if (e.code === 'ECONNREFUSED') {
            this.setState({
              serverError: 'ECONNREFUSED',
            });
            return;
          }
          window.showErrorMessage(`${e}`);
        }
      });
  }

  private loadRunDetailsWhenWorkspaceDetailsAvailable(): void {
    this.select((state) => state.cloudWorkspaceId)
      .pipe(
        distinctUntilChanged(),
        filter((workspaceId) => !!workspaceId),
        switchMap(async () => {
          this.setState({ runDetailsLoading: true });

          try {
            return this.nxCloudApiService.getRunDetails(
              this.state.cloudWorkspaceId
            );
          } catch (e) {
            window.showErrorMessage(`${e}`);
            return undefined;
          }
        }),
        distinctUntilChanged()
      )
      .subscribe((runDetails: RunDetails[] | undefined) =>
        this.setState({
          runDetailsLoading: false,
          runDetails,
        })
      );
  }

  private loadUserDetailsOnAuthenticated() {
    this.select((state) => state.authAccessToken)
      .pipe(
        filter((isAuthenticated) => !!isAuthenticated),
        switchMap(async () => {
          const currentUserResponse =
            await this.nxCloudApiService.getUserDetails();
          return currentUserResponse.currentUser;
        })
      )
      .subscribe((currentUser) => {
        this.setState({ cloudOrgs: currentUser.cloudOrganizations });
      });
  }

  private async listenForIsAuthenticated() {
    const loadAndSetIsAuthenticated = async () => {
      authentication
        .getSession('nxCloud', [], { createIfNone: false })
        .then((session) => {
          this.setState({ authAccessToken: session?.accessToken });
        });
    };
    await loadAndSetIsAuthenticated();
    authentication.onDidChangeSessions(() => {
      loadAndSetIsAuthenticated();
    });
    this.refresh$.subscribe(() => {
      loadAndSetIsAuthenticated();
    });
  }

  private async listenForVcsIntegrationStatus() {
    this.select((state) => ({
      isCloudWorkspaceClaimed: state.isCloudWorkspaceClaimed,
      authAccessToken: state.authAccessToken,
      cloudWorkspaceId: state.cloudWorkspaceId,
    }))
      .pipe(
        filter(
          (partialState) =>
            !!partialState.isCloudWorkspaceClaimed &&
            !!partialState.cloudWorkspaceId
        ),
        distinctUntilChanged(jsonCompare)
      )
      .subscribe(async ({ authAccessToken, cloudWorkspaceId }) => {
        try {
          const vcsIntegrationStatus =
            await this.nxCloudApiService.getVcsIntegrationStatus(
              cloudWorkspaceId,
              authAccessToken
            );
          this.setState({ vcsIntegrationStatus });
        } catch (e) {
          this.setState({ vcsIntegrationStatus: undefined });
        }
      });
  }

  /**
   * Helpers
   */

  private async isUsingCloudRunner(reset = false): Promise<boolean> {
    const nxConfig = (await getNxWorkspace(reset)).workspace;

    if (!nxConfig.tasksRunnerOptions) {
      return false;
    }
    return !!Object.values(nxConfig.tasksRunnerOptions).find(
      (r) => r.runner == '@nrwl/nx-cloud'
    );
  }

  private async getNxCloudBaseUrl(): Promise<string | undefined> {
    const nxConfig = (await getNxWorkspace()).workspace;

    if (!nxConfig.tasksRunnerOptions) {
      return;
    }
    const nxCloudTaskRunner = Object.values(nxConfig.tasksRunnerOptions).find(
      (r) => r.runner == '@nrwl/nx-cloud'
    );

    // remove trailing slash
    return (nxCloudTaskRunner?.options?.url ?? 'https://cloud.nx.app').replace(
      /\/$/,
      ''
    );
  }
}
