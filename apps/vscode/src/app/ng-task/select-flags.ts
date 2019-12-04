import { Option } from '@angular-console/schema';
import { QuickPickItem, window } from 'vscode';
import { NgTaskFlagQuickPickItem } from './ng-task-flag-quick-pick-item';

export async function selectFlags(
  command: string,
  positional: string,
  options: Option[],
  userSetFlags: { [key: string]: string } = {}
): Promise<string[] | undefined> {
  const flagArray = Object.entries(userSetFlags).map(
    ([flagName, value]) => `--${flagName}=${value}`
  );

  const selection = await promptForFlagToSet(
    `ng ${command} ${positional} ${flagArray.join(' ')}`,
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

  return selectFlags(command, positional, options, userSetFlags);
}

async function promptForFlagToSet(
  currentCommand: string,
  options: Option[]
): Promise<{
  execute?: boolean;
  flag?: NgTaskFlagQuickPickItem;
}> {
  const flagItems: Array<QuickPickItem | NgTaskFlagQuickPickItem> = [
    {
      picked: true,
      alwaysShow: true,
      label: `Execute: ${currentCommand}`
    },
    ...options.map(
      option =>
        new NgTaskFlagQuickPickItem(
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

  const flagSelected = Boolean((selection as NgTaskFlagQuickPickItem).option);
  if (!flagSelected) {
    return { execute: true };
  } else {
    return {
      flag: selection as NgTaskFlagQuickPickItem
    };
  }
}

function promptForFlagValue(flagToSet: NgTaskFlagQuickPickItem) {
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
