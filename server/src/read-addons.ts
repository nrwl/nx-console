export function readAddons(packageJson: any) {
  const addons = [];

  if (packageJson.devDependencies['@nrwl/schematics']) {
    addons.push({
      name: '@nrwl/schematics',
      description: 'Makes your CLI more awesome',
      version: '6.1.0'
    });
  }
  if (packageJson.devDependencies['@ngrx/scheamtics']) {
    addons.push({
      name: '@nrwl/schematics',
      description:
        'State management and side-effect management library for Angular',
      version: '6.0.1'
    });
  }

  return addons;
}

export function availableAddons() {
  return [
    {
      name: '@nrwl/schematics',
      description: 'Enterprise-ready Angular CLI',
      version: '6.1.0'
    },
    {
      name: '@ngrx/schematics',
      description:
        'State management and side-effect management library for Angular',
      version: '6.0.1'
    }
  ];
}
