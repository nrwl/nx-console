import { Inject } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { docs } from '../api/docs';
import { Editor, openInEditor } from '../api/read-editors';
import {
  readRecentActions,
  storeTriggeredAction
} from '../api/read-recent-actions';
import { readSettings, storeSettings } from '../api/read-settings';
import { Executable, ExecutableType as Type } from '../api/executable';
import { SelectDirectory } from '../types';
import { FileUtils } from '../utils/file-utils';
import { Telemetry } from '../telemetry';
import { Commands } from '../api/commands';

@Resolver()
export class MutationResolver {
  private readonly ng: Executable;
  private readonly npm: Executable;
  private readonly newWorkspace: Executable;

  constructor(
    @Inject('store') private readonly store: any,
    @Inject('pseudoTerminalFactory')
    pseudoTerminalFactory: any,
    @Inject('selectDirectory')
    private readonly selectDirectoryImpl: SelectDirectory,
    @Inject('commands')
    private readonly commands: Commands,
    private readonly fileUtils: FileUtils,
    @Inject('telemetry')
    private readonly telemetry: Telemetry
  ) {
    // TODO(matt) this should all be moved into DI
    this.ng = new Executable(
      'ng',
      telemetry,
      pseudoTerminalFactory,
      fileUtils,
      commands
    );

    this.npm = new Executable(
      'npm',
      telemetry,
      pseudoTerminalFactory,
      fileUtils,
      commands
    );

    this.newWorkspace = new Executable(
      'new-workspace',
      telemetry,
      pseudoTerminalFactory,
      fileUtils,
      commands
    );

    this.configureNewWorkspace();
  }

  @Mutation()
  async ngAdd(@Args('path') p: string, @Args('name') name: string) {
    try {
      this.telemetry.featureUsed('NG Add');
      this.configureNg(p);
      return this.ng.run(Type.add, p, ['add', name, '--no-interactive']);
    } catch (e) {
      this.handleError("running 'ng add'", e);
    }
  }

  @Mutation()
  async ngNew(
    @Args('path') p: string,
    @Args('name') name: string,
    @Args('collection') collection: string,
    @Args('newCommand') newCommand: string[]
  ) {
    try {
      this.telemetry.featureUsed('New Workspace');
      return this.newWorkspace.run(Type.new, p, [
        name,
        `--directory=${name}`,
        `--collection=${collection}`,
        ...newCommand,
        '--no-interactive'
      ]);
    } catch (e) {
      this.handleError("running 'ng new'", e);
    }
  }

  @Mutation()
  async generate(
    @Args('path') p: string,
    @Args('dryRun') dr: boolean,
    @Args('genCommand') genCommand: string[]
  ) {
    try {
      this.telemetry.featureUsed('Generate');
      const dryRun = dr ? ['--dry-run'] : [];
      this.configureNg(p);
      return this.ng.run(
        Type.generate,
        p,
        ['generate', ...genCommand, ...dryRun, '--no-interactive'],
        !dr
      );
    } catch (e) {
      this.handleError("running 'ng generate'", e);
    }
  }

  @Mutation()
  async generateUsingNpm(
    @Args('path') p: string,
    @Args('npmClient') npmClient: string,
    @Args('dryRun') dr: boolean,
    @Args('genCommand') genCommand: string[]
  ) {
    try {
      this.telemetry.featureUsed('Generate With NPM');
      const dryRun = dr ? ['--dry-run'] : [];

      this.configureNpmClient(npmClient, p);
      return this.npm.run(
        Type.npm,
        p,
        [...genCommand, ...dryRun, '--no-interactive'],
        !dr
      );
    } catch (e) {
      this.handleError('running npm script', e);
    }
  }

  @Mutation()
  async runNg(@Args('path') p: string, @Args('runCommand') rc: string[]) {
    try {
      this.telemetry.featureUsed('Run Custom NG Command');
      this.configureNg(p);
      return this.ng.run(Type.ng, p, rc);
    } catch (e) {
      this.handleError("running 'ng ...'", e);
    }
  }

  @Mutation()
  async runNpm(
    @Args('path') p: string,
    @Args('runCommand') rc: string[],
    @Args('npmClient') npmClient: string
  ) {
    try {
      this.telemetry.featureUsed('Run Custom NPM Command');
      this.configureNpmClient(npmClient, p);
      return this.npm.run(Type.npm, p, rc);
    } catch (e) {
      this.handleError('running npm script', e);
    }
  }

  @Mutation()
  async stopCommand(@Args('id') id: string) {
    try {
      this.telemetry.featureUsed('Stop Command');
      const c = this.commands.findMatchingCommand(id, this.commands.recent);
      let result = false;

      if (c) {
        this.commands.stopCommands([c]);
        result = true;
      }

      return { result };
    } catch (e) {
      this.handleError('stopping commands', e);
    }
  }

  @Mutation()
  async openInBrowser(@Args('url') url: string) {
    this.telemetry.featureUsed('Open In Browser');
    if (url) {
      const opn = require('opn');
      opn(url);
      return { result: true };
    } else {
      return { result: false };
    }
  }

  @Mutation()
  async showItemInFolder(@Args('item') item: string) {
    this.telemetry.featureUsed('Show Item In Folder');
    if (item) {
      const opn = require('opn');
      opn(item).catch((err: any) => console.error(err));
      return { result: true };
    } else {
      return { result: false };
    }
  }

  @Mutation()
  async removeCommand(@Args('id') id: string) {
    try {
      this.telemetry.featureUsed('Remove Command');
      this.commands.removeCommand(id);
      return { result: true };
    } catch (e) {
      this.handleError('removing commands', e);
    }
  }

  @Mutation()
  async exceptionOccured(@Args('error') error: string) {
    this.telemetry.exceptionOccured(error);
  }

  @Mutation()
  async screenViewed(@Args('screen') screen: string) {
    this.telemetry.screenViewed(screen);
  }

  @Mutation()
  async removeAllCommands() {
    try {
      this.telemetry.featureUsed('Remove All Commands');
      this.commands.removeAllCommands();
      return { result: true };
    } catch (e) {
      this.handleError('removing all commands', e);
    }
  }

  @Mutation()
  async restartCommand(@Args('id') id: string) {
    try {
      this.telemetry.featureUsed('Restart Commands');
      this.commands.restartCommand(id);
      return { result: true };
    } catch (e) {
      this.handleError('restarting commands', e);
    }
  }

  @Mutation()
  openInEditor(@Args('editor') editor: Editor, @Args('path') p: string) {
    try {
      this.telemetry.featureUsed('Open in Editor');
      openInEditor(editor, p);
      return { response: 'successful' };
    } catch (e) {
      this.handleError('opening an editor', e);
    }
  }

  @Mutation()
  async selectDirectory(
    @Args('dialogButtonLabel') dialogButtonLabel: string,
    @Args('dialogTitle') dialogTitle: string
  ) {
    if (process.env.CI === 'true') {
      return {
        selectedDirectoryPath: '/tmp'
      };
    } else {
      const directoryPath = await this.selectDirectoryImpl({
        buttonLabel: dialogButtonLabel,
        title: dialogTitle
      });

      return {
        selectedDirectoryPath: directoryPath || null
      };
    }
  }

  @Mutation()
  updateSettings(@Args('data') data: string) {
    this.telemetry.featureUsed('Settings Update');
    const changes = JSON.parse(data);
    storeSettings(this.store, changes);

    if (changes.hasOwnProperty('canCollectData')) {
      changes.canCollectData
        ? this.telemetry.startedTracking()
        : this.telemetry.stoppedTracking();
    }

    return readSettings(this.store);
  }

  @Mutation()
  saveRecentAction(
    @Args('workspacePath') workspacePath: string,
    @Args('projectName') projectName: string,
    @Args('actionName') actionName: string,
    @Args('schematicName') schematicName: string
  ) {
    const key = `${workspacePath}/${projectName}`;
    storeTriggeredAction(this.store, key, actionName, schematicName);
    return readRecentActions(this.store, key);
  }

  @Mutation()
  async openDoc(@Args('id') id: string) {
    const result = await docs.openDoc(id).toPromise();
    return { result };
  }

  configureNg(cwd: string): void {
    const path = this.fileUtils.findClosestNg(cwd);
    this.ng.path = path;
  }

  configureNpmClient(name: string, cwd: string): void {
    const path = this.fileUtils.findExecutable(name, cwd);
    this.npm.name = name;
    this.npm.path = path;
  }

  configureNewWorkspace() {
    this.newWorkspace.path = this.fileUtils.newWorkspacePath();
  }

  handleError(action: string, err: Error): void {
    const msg = `Error when ${action}. Message: "${err.message}"`;
    console.error(msg);
    this.telemetry.exceptionOccured(msg);
    throw new Error(msg);
  }
}
