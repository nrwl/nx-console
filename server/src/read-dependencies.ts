export function readDependencies(
  packageJson: any
): { name: string; version: string }[] {
  const deps = [
    '@angular/cli',
    '@angular/core',
    '@angular/common',
    '@angular/router',
    'typescript',
    'rxjs',
    '@ngrx/store',
    '@ngrx/effects',
    '@nrwl/schematics'
  ];
  return Object.entries({
    ...packageJson.devDependencies,
    ...packageJson.dependencies
  })
    .filter(([name]) => deps.includes(name))
    .map(([name, version]: [string, any]) => ({ name, version }));
}
