import type { NxJsonConfiguration } from 'nx/src/devkit-exports';

export function getNxJsonPrompt(config: NxJsonConfiguration) {
  return `
 Below is the content of nx.json, the configuration file for the Nx workspace.
        It is at the root of the workspace and defines how nx is configured.
        The file contents are annotated marked with <></> with descriptions to help you understand each piece better. The original nx.json does not contain these annotations.
        The user cannot see this nx.json file or the annotations in this conversation, so don't reference them directly. Explain any reference you make to them clearly.
        The nx.json can be changed only if the user query involves making changes to the Nx workspace configuration - don't suggest changes too eagerly.
        
        '-- start of nx.json --'
        ${getAnnotatedNxJson(config)}
        '-- end of nx.json --'
`;
}

function getAnnotatedNxJson(nxJson: NxJsonConfiguration): string {
  let annotated = '';

  if (nxJson.plugins) {
    annotated += `
      <>The 'plugins' section configures how Nx automates tasks for external tools. 
      Plugins search for and read tool-specific configuration files to automatically infer and create appropriate tasks. 
      For example, @nx/webpack looks for webpack.config.js and uses it to create targets.
      Plugins can be listed as strings (without options) or objects (with options),
     and can be scoped to specific projects using 'include' and 'exclude' glob patterns.</>
      `;
    annotated += `"plugins" : ${JSON.stringify(nxJson.plugins)},`;
  }

  if (nxJson.namedInputs) {
    annotated += `namedInputs define reusable sets of inputs that Nx uses to determine when to invalidate its cache.
    Inputs themselves can be file patterns, environment variables, command arguments, or runtime information that affect task execution. 
    When any input changes, Nx knows it needs to re-run the associated tasks.`;
    annotated += `"namedInputs" : ${JSON.stringify(nxJson.namedInputs)},`;
  }

  if (nxJson.targetDefaults) {
    annotated += `<>Target defaults provide a way to set common options that apply across multiple targets in a workspace. 
    When building a project's configuration, Nx will match a target against targetDefaults using either the executor name or target name, and can use glob patterns to match multiple similar targets. </>`;
    annotated += `"targetDefaults" : ${JSON.stringify(nxJson.targetDefaults)},`;
  }

  if (nxJson.release) {
    annotated += `<>The release property in nx.json configures project versioning and publishing. It determines which projects to release and whether they should be released together ('fixed') or independently.
     It handles version management, changelog generation (workspace-wide or per-project), and automated git operations.</>`;
    annotated += `"release" : ${JSON.stringify(nxJson.release)},`;
  }

  if (nxJson.sync) {
    annotated += `<>The sync property configures how nx manages file synchronization before running tasks or CI using the 'nx sync' command. 
    It controls sync generators that modify files automatically, with options to apply changes automatically or require user confirmation.</>`;
    annotated += `"sync" : ${JSON.stringify(nxJson.sync)},`;
  }

  if (nxJson.generators) {
    annotated += `<>The generators property sets default options for generators</>`;
    annotated += `"generators" : ${JSON.stringify(nxJson.generators)},`;
  }

  const otherKeys = Object.keys(nxJson).filter(
    (key) =>
      ![
        'plugins',
        'namedInputs',
        'targetDefaults',
        'release',
        'sync',
        'generators',
      ].includes(key),
  );

  otherKeys.forEach((key) => {
    annotated += `"${key}":${JSON.stringify((nxJson as any)[key])},`;
  });

  return annotated;
}
