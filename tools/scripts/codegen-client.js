const { resolve, join, relative } = require('path');
const { lstatSync, readdirSync, existsSync, mkdirSync } = require('fs');

function listLibs() {
  const libs = resolve(__dirname, '../../libs');
  const isDirectory = source => lstatSync(source).isDirectory();

  return readdirSync(libs)
    .map(name => join(libs, name))
    .filter(isDirectory)
    .map(source => relative(libs, source));
}

function generateLib(lib) {
  const generatedDirPath = resolve(
    __dirname,
    `../../libs/${lib}/src/lib/generated`
  );
  if (!existsSync(generatedDirPath)) {
    mkdirSync(generatedDirPath);
  }

  console.log(
    'generate',
    resolve(__dirname, `../../libs/${lib}/src/lib/generated/graphql.ts`)
  );
  return {
    output: resolve(
      __dirname,
      `../../libs/${lib}/src/lib/generated/graphql.ts`
    ),
    config: {
      documents: resolve(
        __dirname,
        `../../libs/${lib}/src/lib/graphql/**/*.graphql`
      ),
      plugins: [
        'typescript-common',
        'typescript-client',
        'typescript-apollo-angular'
      ]
    }
  };
}

module.exports = {
  schema: resolve(__dirname, '../../libs/server/src/schema/schema.graphql'),
  overwrite: true,
  generates: listLibs()
    .filter(lib => lib !== 'server')
    .map(generateLib)
    .reduce(
      (generates, lib) => ({
        ...generates,
        [lib.output]: lib.config
      }),
      {}
    )
};
