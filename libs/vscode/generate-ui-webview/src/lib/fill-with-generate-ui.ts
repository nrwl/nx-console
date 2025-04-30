import { FormValues } from '@nx-console/shared-generate-ui-types';
import { commands } from 'vscode';

import { window } from 'vscode';
import { updateGenerateUIValues } from './init-generate-ui-webview';

let fillWithGenerateUiService: FillWithGenerateUiService;

export function getFillWithGenerateUiService() {
  if (!fillWithGenerateUiService) {
    fillWithGenerateUiService = new FillWithGenerateUiService();
  }
  return fillWithGenerateUiService;
}

export async function fillWithGenerateUi(
  generatorName: string,
  options: FormValues,
) {
  const prompt = await window.showInputBox({
    title: `What would you like to do with the ${generatorName} generator?`,
  });
  if (!prompt) {
    return;
  }
  getFillWithGenerateUiService().setFillInfo(generatorName, options);
  commands.executeCommand(
    'workbench.action.chat.open',
    `@nx /fill-generate-ui ${prompt}`,
  );
}

export class FillWithGenerateUiService {
  private generatorName: string;
  private formValues: FormValues;

  setFillInfo(generatorName: string, formValues: FormValues) {
    this.generatorName = generatorName;
    this.formValues = formValues;
    commands.executeCommand(
      'setContext',
      'nxConsole.isFillingGenerateUi',
      true,
    );
  }

  getFillInfo() {
    return {
      generatorName: this.generatorName,
      formValues: this.formValues,
    };
  }

  clearFillInfo() {
    this.generatorName = '';
    this.formValues = {} as FormValues;
    commands.executeCommand(
      'setContext',
      'nxConsole.isFillingGenerateUi',
      false,
    );
  }
}
