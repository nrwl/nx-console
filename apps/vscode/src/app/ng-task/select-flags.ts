import { Schema } from '@angular-console/schema';
import { QuickPickItem, window } from 'vscode';
import { NgTaskFlagQuickPickItem } from './ng-task-flag-quick-pick-item';

export async function selectFlags(
  command: string,
  positional: string,
  flagSchemas: Schema[],
  userSetFlags: { [key: string]: string } = {}
): Promise<string[] | undefined> {
  const flagArray = Object.entries(userSetFlags).map(
    ([flagName, value]) => `--${flagName}=${value}`
  );

  const selection = await promptForFlagToSet(
    `ng ${command} ${positional} ${flagArray.join(' ')}`,
    flagSchemas
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

  return selectFlags(command, positional, flagSchemas, userSetFlags);
}

async function promptForFlagToSet(
  currentCommand: string,
  flagSchemas: Schema[]
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
    ...flagSchemas.map(
      schema =>
        new NgTaskFlagQuickPickItem(
          schema.name,
          schema.description || schema.type,
          schema,
          `${schema.name}`
        )
    )
  ];

  const selection = await window.showQuickPick(flagItems, {
    placeHolder: 'Run command or set flags'
  });

  if (!selection) {
    return { execute: false };
  }

  const flagSelected = Boolean((selection as any).schema);
  if (flagSelected) {
    return {
      flag: selection as NgTaskFlagQuickPickItem
    };
  } else {
    return { execute: true };
  }
}

function promptForFlagValue(flagToSet: NgTaskFlagQuickPickItem) {
  const placeHolder = `--${flagToSet.flagName}=...`;
  if (flagToSet.schema.type === 'boolean') {
    return window.showQuickPick(['true', 'false'], {
      placeHolder
    });
  } else if (flagToSet.schema.enum && flagToSet.schema.enum.length) {
    return window.showQuickPick([...flagToSet.schema.enum], {
      placeHolder
    });
  } else {
    return window.showInputBox({
      placeHolder
    });
  }
}
