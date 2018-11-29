const { resolve, join, relative } = require('path');
const { lstatSync, readdirSync } = require('fs');

function listLibs() {
  const libs = resolve(__dirname, 'libs');
  const isDirectory = source => lstatSync(source).isDirectory();

  return readdirSync(libs)
    .map(name => join(libs, name))
    .filter(isDirectory)
    .map(source => relative(libs, source));
}

function generateLib(lib) {
  return {
    output: resolve(__dirname, `libs/${lib}/src/lib/generated/graphql.ts`),
    config: {
      documents: `./libs/${lib}/src/lib/graphql/**/*.graphql`,
      plugins: [
        'typescript-common',
        'typescript-client',
        'typescript-apollo-angular'
      ]
    }
  };
}

module.exports = {
  schema: resolve(__dirname, 'server/src/schema/schema.graphql'),
  overwrite: true,
  generates: listLibs()
    .map(generateLib)
    .reduce(
      (generates, lib) => ({
        ...generates,
        [lib.output]: lib.config
      }),
      {}
    )
};
