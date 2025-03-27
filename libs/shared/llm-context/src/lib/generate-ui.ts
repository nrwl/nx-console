import { existsSync } from 'fs';
import { join } from 'path';
import { getWorkspaceDataDirectory } from '@nx-console/shared-npm';

/**
 * Creates a standardized log file name for generator execution
 */
export async function createGeneratorLogFileName(
  workspacePath: string,
  generatorName: string,
): Promise<string> {
  const sanitizedGeneratorName = generatorName.startsWith('@')
    ? generatorName.substring(1).replace(/\//g, '-')
    : generatorName.replace(/[@/]/g, '-');

  const outputDir = join(
    await getWorkspaceDataDirectory(workspacePath),
    'console-generators',
  );
  const baseFileName = join(outputDir, `${sanitizedGeneratorName}.log`);

  let finalFileName = baseFileName;
  if (existsSync(baseFileName)) {
    let counter = 1;
    do {
      finalFileName = join(
        outputDir,
        `${sanitizedGeneratorName}-${counter}.log`,
      );
      counter++;
    } while (existsSync(finalFileName));
  }

  return finalFileName;
}

/**
 * Creates the response message for when a generator UI is opened
 */
export function createGeneratorUiResponseMessage(
  generatorName: string,
  logFileName: string,
): string {
  return `Opening generate UI for ${generatorName} - THE USER IS MAKING CHANGES. PAUSE YOUR ANSWER. WAIT FOR THEM TO ASK YOU TO FINISH. THE GENERATOR RESULTS WILL BE WRITTEN TO ${logFileName} IF THE USER FINISHES THE GENERATOR. THIS FILE SHOULD NOT BE MENTIONED TO THE USER BUT YOU CAN READ THIS FILE TO UNDERSTAND WHAT HAPPENED DURING THE GENERATOR INVOCATION. IF MULTIPLE GENERATORS ARE INVOKED, THERE WILL BE MULTIPLE FILES.`;
}
