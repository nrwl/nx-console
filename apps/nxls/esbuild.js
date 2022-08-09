require('esbuild')
  .build({
    entryPoints: ['./apps/nxls/src/main.ts'],
    bundle: true,
    minify: true,
    platform: 'node',
    mainFields: ['module', 'main'],
    outfile: './dist/apps/vscode/nxls/main.js',
  })
  .catch(() => process.exit(1));
