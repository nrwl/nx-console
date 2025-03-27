import { getOrSelectGenerator } from '@nx-console/vscode-nx-cli-quickpicks';
import {
  getGeneratorContextV2,
  getGenerators,
} from '@nx-console/vscode-nx-workspace';
import { ExtensionContext, Uri, window } from 'vscode';
import { registerGenerateCommands } from './generate-commands';
import { GenerateUiWebview } from './generate-ui-webview';
import yargs = require('yargs');
import { Option } from '@nx-console/shared-schema';
import { FormValues } from '@nx-console/shared-generate-ui-types';

let generateUIWebview: GenerateUiWebview;

export async function initGenerateUiWebview(context: ExtensionContext) {
  generateUIWebview = new GenerateUiWebview(context);

  registerGenerateCommands(context);
}

export async function openGenerateUi(contextUri?: Uri, projectName?: string) {
  const generator = await getOrSelectGenerator();
  if (!generator) {
    return;
  }

  let generatorContext = await getGeneratorContextV2(contextUri?.fsPath);

  if (projectName) {
    generatorContext = {
      ...generatorContext,
      project: projectName,
    };
  }

  generateUIWebview.openGenerateUi({
    ...generator,
    context: generatorContext,
  });
}

export async function openGenerateUIPrefilled(
  parsedArgs: Awaited<ReturnType<typeof yargs.parse>>,
) {
  const generatorName = parsedArgs['_'][1];
  const generator = await getOrSelectGenerator(generatorName.toString());

  if (!generator) {
    window.showErrorMessage(`Could not find generator ${generatorName}`);
    return;
  }

  const generatorContext = await getGeneratorContextV2(undefined);

  generateUIWebview.openGenerateUi({
    ...generator,
    context: {
      ...generatorContext,
      prefillValues: {
        ...generatorContext.prefillValues,
        ...parseIntoPrefillValues(parsedArgs, generator.options),
      },
    },
  });
}

export async function updateGenerateUIValues(formValues: FormValues) {
  generateUIWebview.updateFormValues(formValues);
}

function parseIntoPrefillValues(
  yargsParseResult: Awaited<ReturnType<typeof yargs.parse>>,
  options: Option[],
): Record<string, string> {
  const positionals = yargsParseResult['_'].slice(2);

  const positionalFlags = options
    .filter((opt) => opt.positional !== undefined)
    .sort((a, b) => {
      return a.positional - b.positional;
    });

  const prefillValues: Record<string, string> = {};
  for (let i = 0; i < positionals.length; i++) {
    const positional = positionals[i];
    const flag = positionalFlags[i];
    if (flag) {
      prefillValues[flag.name] = positional.toString();
    }
  }

  for (const [key, value] of Object.entries(yargsParseResult)) {
    if (key !== '_' && key !== '$0' && value !== undefined) {
      prefillValues[key] = value.toString();
    }
  }

  return prefillValues;
}
