import { Option } from '@nx-console/shared-schema';
import { getNxExecutionCommand } from '@nx-console/shared-npm';
import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { vscodeLogger } from '@nx-console/vscode-output-channels';
import { splitCommandLine } from '@nx-console/vscode-utils';
import { env, QuickPickItem, ThemeIcon, window } from 'vscode';
import { formatCommand } from './format-command';

class CliTaskFlagQuickPickItem implements QuickPickItem {
  constructor(
    readonly flagName: string,
    readonly detail = '',
    readonly option: Option,
    readonly label: string,
    readonly description?: string,
  ) {}
}

class ExecuteCommandQuickPickItem implements QuickPickItem {
  readonly buttons = [
    { iconPath: new ThemeIcon('copy'), tooltip: 'Copy command to clipboard' },
  ];
  type = 'execute';
  picked = true;
  alwaysShow = true;

  constructor(
    readonly label: string,
    readonly description?: string,
  ) {}
}

class CustomOptionsQuickPickItem implements QuickPickItem {
  type = 'custom';
  alwaysShow = true;

  constructor(
    readonly label: string,
    readonly description?: string,
  ) {}
}

/**
 * Returns undefined if the user wants to cancel the command.
 * Returns an empty array to run the command without flags.
 * Returns an array populated with flags if the user provides them.
 */
export async function selectFlags(
  command: string,
  options: Option[],
  userSetFlags: { [key: string]: string } = {},
  customOptions?: string,
): Promise<string[] | undefined> {
  const flagArray = Object.entries(userSetFlags).map(
    ([flagName, value]) => `--${flagName}=${value}`,
  );
  if (customOptions) {
    flagArray.push(...splitCommandLine(customOptions));
  }

  const selection = await promptForFlagToSet(
    command,
    flagArray,
    options.filter((option) => !userSetFlags[option.name]),
  );

  if (selection.execute !== undefined) {
    return selection.execute ? flagArray : undefined;
  }

  if (selection.flag) {
    const flagValue = await promptForFlagValue(selection.flag);

    if (flagValue && flagValue.length > 0) {
      userSetFlags[selection.flag.flagName] = flagValue;
    } else {
      delete userSetFlags[selection.flag.flagName];
    }
  } else if (selection.customOptions) {
    const customOptionResult = await promptForCustomOptions(customOptions);
    if (customOptionResult) {
      customOptions = customOptionResult;
    }
  }

  return selectFlags(command, options, userSetFlags, customOptions);
}

async function promptForFlagToSet(
  command: string,
  flagArray: string[],
  options: Option[],
): Promise<{
  execute?: boolean;
  flag?: CliTaskFlagQuickPickItem;
  customOptions?: boolean;
}> {
  const flagItems: Array<
    | CliTaskFlagQuickPickItem
    | ExecuteCommandQuickPickItem
    | CustomOptionsQuickPickItem
  > = [
    new ExecuteCommandQuickPickItem(
      `Execute: nx ${command} ${flagArray.join(' ')}`,
    ),
    ...options.map((option) => {
      const detail =
        option.description ??
        (Array.isArray(option.type) ? option.type?.[0] : option.type);
      return new CliTaskFlagQuickPickItem(
        option.name,
        detail,
        option,
        `${option.name}`,
        option.isRequired ? 'required' : undefined,
      );
    }),
    new CustomOptionsQuickPickItem(
      'Custom Options',
      'Add any additional command text.',
    ),
  ];

  const selection = await new Promise<(typeof flagItems)[number] | undefined>(
    (resolve) => {
      const quickPick = window.createQuickPick<(typeof flagItems)[number]>();
      quickPick.items = flagItems;
      quickPick.placeholder = 'Execute command or set flags';
      const listeners = [
        quickPick.onDidAccept(() => {
          const item = quickPick.selectedItems[0];
          if (item) {
            resolve(item);
            quickPick.hide();
          }
        }),
        quickPick.onDidTriggerItemButton(async ({ item }) => {
          if (item instanceof ExecuteCommandQuickPickItem) {
            try {
              const displayCommand = formatCommand(command, flagArray);
              const workspace = await getNxWorkspace();
              const clipboardCommand = workspace
                ? await getNxExecutionCommand({
                    cwd: workspace.workspacePath,
                    encapsulatedNx: workspace.isEncapsulatedNx,
                    displayCommand,
                  })
                : displayCommand;
              await env.clipboard.writeText(clipboardCommand);
              await window.showInformationMessage(
                'Command copied to clipboard',
              );
            } catch (error) {
              vscodeLogger.log(`Unable to copy command: ${error}`);
            }
          }
        }),
        quickPick.onDidHide(() => {
          resolve(undefined);
          listeners.forEach((listener) => listener.dispose());
          quickPick.dispose();
        }),
      ];
      quickPick.show();
    },
  );

  if (!selection) {
    return { execute: false };
  }

  const flagSelected = Boolean((selection as CliTaskFlagQuickPickItem).option);
  if (!flagSelected) {
    if ((selection as CustomOptionsQuickPickItem).type === 'custom') {
      return { customOptions: true };
    } else {
      return { execute: true };
    }
  } else {
    return {
      flag: selection as CliTaskFlagQuickPickItem,
    };
  }
}

function promptForFlagValue(flagToSet: CliTaskFlagQuickPickItem) {
  const placeHolder = `--${flagToSet.flagName}=...`;
  if (flagToSet.option.type === 'boolean') {
    return window.showQuickPick(['true', 'false'], {
      placeHolder,
    });
  } else if (flagToSet.option.enum && flagToSet.option.enum.length) {
    return window.showQuickPick([...flagToSet.option.enum.map(String)], {
      placeHolder,
      canPickMany: flagToSet.option.type === 'array',
    });
  } else {
    return window.showInputBox({
      placeHolder,
    });
  }
}

function promptForCustomOptions(oldCustomOptions?: string) {
  return window.showInputBox({
    value: oldCustomOptions,
    placeHolder: 'Enter any additional command text.',
  });
}
