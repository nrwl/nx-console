// We use known builders to ensure that input flags and output are what we expect.
export const SUPPORTED_SERVE_BUILDERS = [
  '@angular-devkit/build-angular:dev-server',
  '@nrwl/builders:web-dev-server',
];
export const SUPPORTED_BUILD_BUILDERS = [
  '@angular-devkit/build-angular:browser',
  '@nrwl/builders:web-build',
];

export function getProjectArchitect(
  project: string,
  operation: string,
  angularJson: any
): any {
  try {
    return angularJson.projects[project].architect[operation];
  } catch (err) {
    return {};
  }
}
