import { gte } from '@nx-console/nx-version';
import { nxConsoleRules } from '@nx-console/shared-llm-context';
import { detectPackageManager } from '@nx-console/shared-npm';
import { isNxCloudUsed } from '@nx-console/shared-nx-cloud';
import {
  getNxWorkspacePath,
  GlobalConfigurationStore,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode-configuration';
import { onWorkspaceRefreshed } from '@nx-console/vscode-lsp-client';
import { getNxVersion } from '@nx-console/vscode-nx-workspace';
import { isInCursor, isInVSCode, vscodeLogger } from '@nx-console/vscode-utils';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import ignore from 'ignore';
import type { PackageManager } from 'nx/src/devkit-exports';
import { dirname, join, relative } from 'path';
import { ExtensionContext, window } from 'vscode';

const GENERATE_RULES_KEY = 'generateAiAgentRules';

interface RuleInfo {
  path: (workspacePath: string) => string;
  wrapContent: (content: string) => string;
  notificationMessage: string;
}

const cursorRuleInfo: RuleInfo = {
  path: (workspacePath: string) =>
    join(workspacePath, '.cursor', 'rules', 'nx-rules.mdc'),
  wrapContent: (content: string) => `---
description: 
globs: 
alwaysApply: true
---
${content}
`,
  notificationMessage:
    'Improve Cursor Agents by setting up a file with Nx-specific rules?',
};

const vscodeRuleInfo: RuleInfo = {
  path: (workspacePath: string) =>
    join(workspacePath, '.github', 'instructions', 'nx.instructions.md'),
  wrapContent: (content: string) => `---
applyTo: '**'
---
${content}
`,
  notificationMessage:
    'Improve Copilot Agents by setting up a file with Nx-specific instructions?',
};

export class AgentRulesManager {
  private packageManager?: PackageManager;
  private nxVersion?: string;
  private usingCloud = false;

  constructor(private context: ExtensionContext) {}

  public async initialize(): Promise<void> {
    const workspacePath = getNxWorkspacePath();
    this.usingCloud = await isNxCloudUsed(workspacePath, vscodeLogger);
    this.packageManager = await detectPackageManager(
      workspacePath,
      vscodeLogger,
    );
    this.nxVersion = (await getNxVersion())?.full;

    if (GlobalConfigurationStore.instance.get(GENERATE_RULES_KEY, false)) {
      await this.writeAgentRules();
    }

    this.setupUpdates();
  }

  public async writeAgentRules(): Promise<void> {
    const ruleInfo = this.getRuleInfo();
    if (!ruleInfo) {
      return;
    }

    const wrappedContent = ruleInfo.wrapContent(
      nxConsoleRules(this.packageManager, this.nxVersion, this.usingCloud),
    );

    const rulePath = ruleInfo.path(getNxWorkspacePath());
    const dir = dirname(rulePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(rulePath, wrappedContent);
  }

  // how and where to write rules for each editor
  public getRuleInfo(): RuleInfo | null {
    if (isInCursor()) {
      return cursorRuleInfo;
    } else if (isInVSCode()) {
      return vscodeRuleInfo;
    }

    return null;
  }

  public setupUpdates(): void {
    this.context.subscriptions.push(
      onWorkspaceRefreshed(async () => {
        if (
          (await this.checkEnvironmentChanges()) &&
          GlobalConfigurationStore.instance.get(GENERATE_RULES_KEY, false)
        ) {
          await this.writeAgentRules();
        }
      }),
    );
  }

  public async checkEnvironmentChanges(): Promise<boolean> {
    if (!GlobalConfigurationStore.instance.get(GENERATE_RULES_KEY, false)) {
      return false;
    }

    const workspacePath = getNxWorkspacePath();
    const newUsingCloud = await isNxCloudUsed(workspacePath, vscodeLogger);
    const newPackageManager = await detectPackageManager(
      workspacePath,
      vscodeLogger,
    );
    const newNxVersion = (await getNxVersion())?.full;

    const shouldUpdate =
      newUsingCloud !== this.usingCloud ||
      newPackageManager !== this.packageManager ||
      newNxVersion !== this.nxVersion;

    if (shouldUpdate) {
      this.usingCloud = newUsingCloud;
      this.packageManager = newPackageManager;
      this.nxVersion = newNxVersion;
    }

    return shouldUpdate;
  }

  public async addAgentRulesToWorkspace(): Promise<void> {
    GlobalConfigurationStore.instance.set(GENERATE_RULES_KEY, true);

    await this.writeAgentRules();
    // it makes sense to not add these files to git. However should users really want to, we won't enforce this after the initial setup
    this.ensureRulesAreGitignored();
  }

  public ensureRulesAreGitignored(): void {
    if (gte(this.nxVersion ?? '', '21.1.0-beta.2')) {
      return;
    }

    const workspacePath = getNxWorkspacePath();
    const gitIgnorePath = join(workspacePath, '.gitignore');
    let newContent = `\n`;
    for (const ruleInfo of [cursorRuleInfo, vscodeRuleInfo]) {
      const relativeRulePath = relative(
        workspacePath,
        ruleInfo.path(workspacePath),
      );
      const ig = ignore({}).add(gitIgnorePath);

      if (ig.ignores(relativeRulePath)) {
        return;
      } else {
        newContent += `${relativeRulePath}\n`;
      }
    }
    appendFileSync(gitIgnorePath, newContent);
  }

  public async showAgentRulesNotification(): Promise<void> {
    const dontAskAgain = WorkspaceConfigurationStore.instance.get(
      'mcpDontAskAgain',
      false,
    );

    if (dontAskAgain) {
      return;
    }

    const rulesEnabled = GlobalConfigurationStore.instance.get(
      GENERATE_RULES_KEY,
      false,
    );
    if (rulesEnabled) {
      return;
    }

    const ruleInfo = this.getRuleInfo();
    if (!ruleInfo) {
      return;
    }

    window
      .showInformationMessage(
        ruleInfo.notificationMessage,
        'Yes',
        "Don't ask again",
      )
      .then(async (answer) => {
        if (answer === "Don't ask again") {
          WorkspaceConfigurationStore.instance.set('mcpDontAskAgain', true);
        }

        if (answer === 'Yes') {
          await this.addAgentRulesToWorkspace();
        }
      });
  }
}
