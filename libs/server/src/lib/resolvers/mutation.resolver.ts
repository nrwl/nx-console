import { Inject } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import * as path from 'path';
import * as semver from 'semver';

import { docs } from '../api/docs';
import { installNodeJs } from '../api/install-nodejs';
import { Editor, openInEditor } from '../api/read-editors';
import { readSettings, storeSettings } from '../api/read-settings';
import { commands, runCommand } from '../api/run-command';
import { SelectDirectory } from '../types';
import { platform } from 'os';
import { FileUtils } from '../utils/file-utils';
import { readJsonFile } from '../utils/utils';
import {
  storeTriggeredAction,
  readRecentActions
} from '../api/read-recent-actions';

@Resolver()
export class MutationResolver {
  constructor(
    @Inject('store') private readonly store: any,
    @Inject('pseudoTerminalFactory')
    private readonly pseudoTerminalFactory: any,
    @Inject('selectDirectory')
    private readonly selectDirectoryImpl: SelectDirectory,
    private readonly fileUtils: FileUtils
  ) {}

  @Mutation()
  async ngAdd(@Args('path') p: string, @Args('name') name: string) {
    try {
      return runCommand(
        'add',
        p,
        'ng',
        this.fileUtils.findClosestNg(p),
        ['add', name, ...this.disableInteractivePrompts(p)],
        this.pseudoTerminalFactory,
        this.fileUtils
      );
    } catch (e) {
      console.error(e);
      throw new Error(`Error when running 'ng add'. Message: "${e.message}"`);
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
      return runCommand(
        'new',
        p,
        'new-workspace',
        path.join(
          __dirname,
          'assets',
          platform() === 'win32' && !this.fileUtils.isWsl()
            ? 'new-workspace.cmd'
            : 'new-workspace'
        ),
        [
          name,
          `--directory=${name}`,
          `--collection=${collection}`,
          ...newCommand,
          '--no-interactive'
        ],
        this.pseudoTerminalFactory,
        this.fileUtils
      );
    } catch (e) {
      console.error(e);
      throw new Error(`Error when running 'ng new'. Message: "${e.message}"`);
    }
  }

  @Mutation()
  async generate(
    @Args('path') p: string,
    @Args('dryRun') dr: boolean,
    @Args('genCommand') genCommand: string[]
  ) {
    try {
      const dryRun = dr ? ['--dry-run'] : [];
      return runCommand(
        'generate',
        p,
        'ng',
        this.fileUtils.findClosestNg(p),
        [
          'generate',
          ...genCommand,
          ...dryRun,
          ...this.disableInteractivePrompts(p)
        ],
        this.pseudoTerminalFactory,
        this.fileUtils,
        !dr
      );
    } catch (e) {
      console.error(e);
      throw new Error(
        `Error when running 'ng generate'. Message: "${e.message}"`
      );
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
      const dryRun = dr ? ['--dry-run'] : [];
      return runCommand(
        'npm',
        p,
        npmClient,
        this.fileUtils.findExecutable(npmClient, p),
        [...genCommand, ...dryRun, ...this.disableInteractivePrompts(p)],
        this.pseudoTerminalFactory,
        this.fileUtils,
        !dr
      );
    } catch (e) {
      console.error(e);
      throw new Error(`Error when running npm script. Message: "${e.message}"`);
    }
  }

  @Mutation()
  async runNg(@Args('path') p: string, @Args('runCommand') rc: string[]) {
    try {
      return runCommand(
        'ng',
        p,
        'ng',
        this.fileUtils.findClosestNg(p),
        rc,
        this.pseudoTerminalFactory,
        this.fileUtils
      );
    } catch (e) {
      console.error(e);
      throw new Error(`Error when running 'ng ...'. Message: "${e.message}"`);
    }
  }

  @Mutation()
  async runNpm(
    @Args('path') p: string,
    @Args('runCommand') rc: string[],
    @Args('npmClient') npmClient: string
  ) {
    try {
      return runCommand(
        'npm',
        p,
        npmClient,
        this.fileUtils.findExecutable(npmClient, p),
        rc,
        this.pseudoTerminalFactory,
        this.fileUtils
      );
    } catch (e) {
      console.error(e);
      throw new Error(`Error when running npm script. Message:"${e.message}"`);
    }
  }

  @Mutation()
  async installNodeJs() {
    return installNodeJs();
  }

  @Mutation()
  async stopCommand(@Args('id') id: string) {
    try {
      const c = commands.findMatchingCommand(id, commands.recent);
      if (c) {
        commands.stopCommands([c]);
        return { result: true };
      } else {
        return { result: false };
      }
    } catch (e) {
      console.error(e);
      throw new Error(`Error when stopping commands. Message: "${e.message}"`);
    }
  }

  @Mutation()
  async openInBrowser(@Args('url') url: string) {
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
      commands.removeCommand(id);
      return { result: true };
    } catch (e) {
      console.error(e);
      throw new Error(`Error when removing commands. Message: "${e.message}"`);
    }
  }

  @Mutation()
  async removeAllCommands() {
    try {
      commands.removeAllCommands();
      return { result: true };
    } catch (e) {
      console.error(e);
      throw new Error(`Error when removing commands. Message: "${e.message}"`);
    }
  }

  @Mutation()
  async restartCommand(@Args('id') id: string) {
    try {
      commands.restartCommand(id);
      return { result: true };
    } catch (e) {
      console.error(e);
      throw new Error(
        `Error when restarting commands. Message: "${e.message}"`
      );
    }
  }

  @Mutation()
  openInEditor(@Args('editor') editor: Editor, @Args('path') p: string) {
    try {
      openInEditor(editor, p);
      return { response: 'successful' };
    } catch (e) {
      console.error(e);
      throw new Error(`Error when opening an editor. Message: "${e.message}"`);
    }
  }

  @Mutation()
  async selectDirectory(
    @Args('dialogButtonLabel') dialogButtonLabel: string,
    @Args('dialogTitle') dialogTitle: string
  ) {
    // TODO(jack): This mocked value is needed because e2e tests that bring up the dialog will block entire electron main thread.
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
    storeSettings(this.store, JSON.parse(data));
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

  disableInteractivePrompts(p: string) {
    try {
      const version = readJsonFile(
        path.join(`@angular`, 'cli', 'package.json'),
        path.join(p, 'node_modules')
      ).json.version;
      return semver.gte(version, '7.0.0') ? ['--no-interactive'] : [];
    } catch (e) {
      console.log('cannot parse cli version', e.message);
      // don't recognize the version => assume it's greater than 7
      return ['--no-interactive'];
    }
  }
}
