export function completeFiles(
  files: { [path: string]: string[] },
  workspace: any,
  input: string
) {
  const path = workspace.path;
  if (!files[path]) return [];
  return files[path]
    .filter(f => f.indexOf(input) > -1)
    .map(value => value.substring(path.length + 1))
    .map(value => ({ value }));
}

export function completeProjects(workspace: any, input: string) {
  return workspace.projects
    .map((p: any) => p.name)
    .filter((p: string) => p.indexOf(input) > -1)
    .map((value: any) => ({ value }));
}

export function completeModules(
  files: { [path: string]: string[] },
  workspace: any,
  input: string
) {
  const path = workspace.path;
  if (!files[path]) return [];
  return files[path]
    .filter(f => f.indexOf('module.ts') > -1)
    .filter(f => f.indexOf(input) > -1)
    .map(fullPath => {
      const modulePath = fullPath.substring(workspace.path.length + 1);
      const parts = modulePath.split('/');
      const value = parts[parts.length - 1];
      return {
        value,
        display: modulePath
      };
    });
}
