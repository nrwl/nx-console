import { Option } from '@nx-console/schema';
import { QuickPickItem, window } from 'vscode';
import { CliTaskFlagQuickPickItem } from './cli-task-flag-quick-pick-item';

export async function selectFlags(
  command: string,
  options: Option[],
  workspaceType: 'ng' | 'nx',
  userSetFlags: { [key: string]: string } = {}
): Promise<string[] | undefined> {
  const flagArray = Object.entries(userSetFlags).map(
    ([flagName, value]) => `--${flagName}=${value}`
  );

  const selection = await promptForFlagToSet(
    `${workspaceType} ${command} ${flagArray.join(' ')}`,
    options
  );

  if (!selection.flag) {
    return selection.execute ? flagArray : undefined;
  }

  const flagValue = await promptForFlagValue(selection.flag);

  if (flagValue) {
    userSetFlags[selection.flag.flagName] = flagValue;
  } else {
    delete userSetFlags[selection.flag.flagName];
  }

  return selectFlags(command, options, workspaceType, userSetFlags);
}

async function promptForFlagToSet(
  currentCommand: string,
  options: Option[]
): Promise<{
  execute?: boolean;
  flag?: CliTaskFlagQuickPickItem;
}> {
  const flagItems: Array<QuickPickItem | CliTaskFlagQuickPickItem> = [
    {
      picked: true,
      alwaysShow: true,
      label: `Execute: ${currentCommand}`
    },
    ...options.map(
      option =>
        new CliTaskFlagQuickPickItem(
          option.name,
          option.description || option.type,
          option,
          `${option.name}`
        )
    )
  ];

  const selection = await window.showQuickPick(flagItems, {
    placeHolder: 'Execute command or set flags'
  });

  if (!selection) {
    return { execute: false };
  }

  const flagSelected = Boolean((selection as CliTaskFlagQuickPickItem).option);
  if (!flagSelected) {
    return { execute: true };
  } else {
    return {
      flag: selection as CliTaskFlagQuickPickItem
    };
  }
}

function promptForFlagValue(flagToSet: CliTaskFlagQuickPickItem) {
  const placeHolder = `--${flagToSet.flagName}=...`;
  if (flagToSet.option.type === 'boolean') {
    return window.showQuickPick(['true', 'false'], {
      placeHolder
    });
  } else if (flagToSet.option.enum && flagToSet.option.enum.length) {
    return window.showQuickPick([...flagToSet.option.enum.map(String)], {
      placeHolder
    });
  } else {
    return window.showInputBox({
      placeHolder
    });
  }
}
