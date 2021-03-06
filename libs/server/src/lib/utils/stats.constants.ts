// For some reason source map + source-map-explorer is showing weird paths for some scoped modules.
// This is a workaround for now to map known modules back to the correct node_modules path.
// TODO: Find a better solution for this so we don't need special mappings.
export const SPECIAL_SOURCE_FILE_MAPPINGS: { [k: string]: string } = {
  'packages/animations': 'node_modules/@angular/animations',
  'packages/cdk': 'node_modules/@angular/cdk',
  'packages/cli': 'node_modules/@angular/cli',
  'packages/compiler': 'node_modules/@angular/compiler',
  'packages/compiler-cli': 'node_modules/@angular/compiler-cli',
  'packages/common': 'node_modules/@angular/common',
  'packages/core': 'node_modules/@angular/core',
  'packages/elements': 'node_modules/@angular/elements',
  'packages/flex-layout': 'node_modules/@angular/flex-layout',
  'packages/forms': 'node_modules/@angular/forms',
  'packages/http': 'node_modules/@angular/http',
  'packages/language-service': 'node_modules/@angular/language-service',
  'packages/material': 'node_modules/@angular/material',
  'packages/platform-server': 'node_modules/@angular/platform-server',
  'packages/platform-browser': 'node_modules/@angular/platform-browser',
  'packages/platform-browser-dynamic':
    'node_modules/@angular/platform-browser-dynamic',
  'packages/router': 'node_modules/@angular/router',
  'src/animations': 'node_modules/@angular/animations',
  'src/cdk': 'node_modules/@angular/cdk',
  'src/cli': 'node_modules/@angular/cli',
  'src/compiler': 'node_modules/@angular/compiler',
  'src/compiler-cli': 'node_modules/@angular/compiler-cli',
  'src/common': 'node_modules/@angular/common',
  'src/core': 'node_modules/@angular/core',
  'src/elements': 'node_modules/@angular/elements',
  'src/flex-layout': 'node_modules/@angular/flex-layout',
  'src/forms': 'node_modules/@angular/forms',
  'src/http': 'node_modules/@angular/http',
  'src/language-service': 'node_modules/@angular/language-service',
  'src/material': 'node_modules/@angular/material',
  'src/platform-server': 'node_modules/@angular/platform-server',
  'src/platform-browser': 'node_modules/@angular/platform-browser',
  'src/platform-browser-dynamic':
    'node_modules/@angular/platform-browser-dynamic',
  'src/router': 'node_modules/@angular/router',
  'modules/effects': 'node_modules/@ngrx/effects',
  'modules/entity': 'node_modules/@ngrx/entity',
  'modules/router-store': 'node_modules/@ngrx/router-store',
  'modules/schematics': 'node_modules/@ngrx/schematics',
  'modules/store': 'node_modules/@ngrx/store',
  'modules/store-devtools': 'node_modules/@ngrx/store-devtools',
  buildin: 'node_modules/webpack/buildin',
  'modules/@nrwl': 'node_modules/@nrwl',
  'src/lib/nx': 'node_modules/@nrwl/nx',
  'src/lib/tabs': 'node_modules/@angular/material/tabs',
  'src/lib/tree': 'node_modules/@angular/material/tree',
  'src/lib/tooltip': 'node_modules/@angular/material/tooltip',
  'src/lib/sidenav': 'node_modules/@angular/material/sidenav',
  'src/lib/radio': 'node_modules/@angular/material/radio',
  'src/lib/card': 'node_modules/@angular/material/card',
  'src/lib/core': 'node_modules/@angular/material/core',
  'src/lib/autocomplete': 'node_modules/@angular/material/autocomplete',
  'src/lib/sort': 'node_modules/@angular/material/sort',
  'src/lib/chips': 'node_modules/@angular/material/chips',
  'src/lib/input': 'node_modules/@angular/material/input',
  'src/lib/progress-bar': 'node_modules/@angular/material/progress-bar',
  'src/lib/slide-toggle': 'node_modules/@angular/material/slide-toggle',
  'src/lib/datepicker': 'node_modules/@angular/material/datepicker',
  'src/lib/typings': 'node_modules/@angular/material/typings',
  'src/lib/toolbar': 'node_modules/@angular/material/toolbar',
  'src/lib/checkbox': 'node_modules/@angular/material/checkbox',
  'src/lib/slider': 'node_modules/@angular/material/slider',
  'src/lib/stepper': 'node_modules/@angular/material/stepper',
  'src/lib/progress-spinner': 'node_modules/@angular/material/progress-spinner',
  'src/lib/esm2015': 'node_modules/@angular/material/esm2015',
  'src/lib/esm5': 'node_modules/@angular/material/esm5',
  'src/lib/dialog': 'node_modules/@angular/material/dialog',
  'src/lib/form-field': 'node_modules/@angular/material/form-field',
  'src/lib/expansion': 'node_modules/@angular/material/expansion',
  'src/lib/button': 'node_modules/@angular/material/button',
  'src/lib/table': 'node_modules/@angular/material/table',
  'src/lib/list': 'node_modules/@angular/material/list',
  'src/lib/divider': 'node_modules/@angular/material/divider',
  'src/lib/menu': 'node_modules/@angular/material/menu',
  'src/lib/bottom-sheet': 'node_modules/@angular/material/bottom-sheet',
  'src/lib/select': 'node_modules/@angular/material/select',
  'src/lib/icon': 'node_modules/@angular/material/icon',
  'src/lib/paginator': 'node_modules/@angular/material/paginator',
  'src/lib/schematics': 'node_modules/@angular/material/schematics',
  'src/lib/prebuilt-themes': 'node_modules/@angular/material/prebuilt-themes',
  'src/lib/bundles': 'node_modules/@angular/material/bundles',
  'src/lib/badge': 'node_modules/@angular/material/badge',
  'src/lib/snack-bar': 'node_modules/@angular/material/snack-bar',
  'src/lib/grid-list': 'node_modules/@angular/material/grid-list',
  'src/lib/flex': 'node_modules/@angular/flex-layout/flex',
  'src/lib/extended': 'node_modules/@angular/flex-layout/extended',
  'src/lib/grid': 'node_modules/@angular/flex-layout/grid',
};
