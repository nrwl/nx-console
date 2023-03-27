(async () => {
  let esbuild = require('esbuild');

  let result = await esbuild.build({
    entryPoints: ['./apps/nxls/src/main.ts'],
    bundle: true,
    minify: true,
    platform: 'node',
    mainFields: ['module', 'main'],
    outfile: './dist/apps/nxls/main.js',
    metafile: true,
    sourcemap: true,
    external: [
      'typescript',
      'ts-node',
      '@swc/*',
      '@parcel/watcher',
      'nx',
      'webpack',
    ],
    loader: { '.node': 'file' },
  });

  let text = await esbuild.analyzeMetafile(result.metafile, {
    verbose: true,
  });

  // Comment out to analyze the build
  // await require('fs/promises').writeFile('./dep.txt', text);
})();
