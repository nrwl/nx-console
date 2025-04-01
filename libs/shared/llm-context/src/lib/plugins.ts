import {
  getLocalWorkspacePlugins,
  isDotNxInstallation,
} from '@nx-console/shared-npm';
import {
  AvailableNxPlugin,
  getAvailableNxPlugins,
} from '@nx-console/shared-utils';
import { NxVersion } from '@nx-console/nx-version';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { NxWorkspace } from '@nx-console/shared-types';

export interface LoggerInterface {
  log: (message: string) => void;
  error?: (message: string) => void;
}

/**
 * Gets the formatted plugins information
 */
export async function getPluginsInformation(
  nxVersion: NxVersion | undefined,
  workspacePath: string | undefined,
  nxWorkspace: NxWorkspace | undefined,
  logger?: LoggerInterface,
): Promise<{
  formattedText: string;
  official: AvailableNxPlugin[];
  community: AvailableNxPlugin[];
  installed: string[];
  local: string[];
}> {
  const availablePlugins = await getAvailableNxPlugins(nxVersion);

  const availablePluginNames = new Set([
    ...availablePlugins.official.map((plugin) => plugin.name),
    ...availablePlugins.community.map((plugin) => plugin.name),
  ]);

  const localWorkspacePlugins: string[] = [];
  let installedPlugins: string[] = [];

  if (workspacePath && nxWorkspace) {
    try {
      const isDotNx = await isDotNxInstallation(workspacePath);

      const packageJsonPath = isDotNx
        ? join(workspacePath, '.nx', 'installation', 'package.json')
        : join(workspacePath, 'package.json');

      const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      const allDependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      installedPlugins = Object.keys(allDependencies).filter((depName) =>
        availablePluginNames.has(depName),
      );
    } catch (error) {
      const errorMessage = `Error determining installed plugins: ${
        error instanceof Error ? error.message : String(error)
      }`;
      if (logger) {
        logger.log(errorMessage);
      } else if (console) {
        console.error(errorMessage);
      }
      installedPlugins = [];
    }

    try {
      const localPluginsMap = await getLocalWorkspacePlugins(
        workspacePath,
        nxWorkspace,
      );
      localPluginsMap.forEach((plugin) => {
        localWorkspacePlugins.push(plugin.name);
      });
    } catch (error) {
      const errorMessage = `Error determining local plugins: ${
        error instanceof Error ? error.message : String(error)
      }`;
      if (logger) {
        logger.log(errorMessage);
      } else if (console) {
        console.error(errorMessage);
      }
    }
  }

  const formattedText = formatAvailablePluginsPrompt(
    availablePlugins.official,
    installedPlugins,
    localWorkspacePlugins,
  );

  return {
    formattedText,
    official: availablePlugins.official,
    community: availablePlugins.community,
    installed: installedPlugins,
    local: localWorkspacePlugins,
  };
}

/**
 * Formats the available plugins information into a human-readable text format
 */
export function formatAvailablePluginsPrompt(
  officialPlugins: AvailableNxPlugin[],
  installedPlugins: string[] = [],
  localWorkspacePlugins: string[] = [],
): string {
  let formattedText = '';

  if (localWorkspacePlugins.length > 0) {
    formattedText += `=== LOCAL NX PLUGINS ===\n`;
    formattedText += `(Note: These plugins are local to your workspace)\n\n`;
    localWorkspacePlugins.forEach((pluginName) => {
      formattedText += `[${pluginName}]\n`;
    });
    formattedText += `\n`;
  }

  if (installedPlugins.length > 0) {
    formattedText += `=== INSTALLED NX PLUGINS ===\n`;
    formattedText += `(Note: Installed plugins are not repeated in other categories)\n\n`;
    installedPlugins.forEach((pluginName) => {
      formattedText += `[${pluginName}]\n`;
    });
    formattedText += `\n`;
  }

  formattedText += `=== OFFICIAL NX PLUGINS ===\n`;
  formattedText += `(Note: These plugins are not installed to your workspace, DO NOT TRY TO USE THEM. You can add them by running 'nx add {PLUGIN-NAME})' \n\n`;

  officialPlugins
    .filter((plugin) => !installedPlugins.includes(plugin.name))
    .forEach((plugin) => {
      const cleanDescription = plugin.description
        ? plugin.description.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
        : '';

      formattedText += `[${plugin.name}]\n${cleanDescription}\n`;
    });

  return formattedText;
}
