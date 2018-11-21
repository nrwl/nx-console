import { generate } from 'graphql-code-generator';
import { Types } from 'graphql-codegen-core';
import { resolve, join, relative } from 'path';
import { lstatSync, readdirSync } from 'fs';

function listLibs() {
  const libs = resolve(__dirname, '../libs');
  const isDirectory = (source: string) => lstatSync(source).isDirectory();

  return readdirSync(libs)
    .map(name => join(libs, name))
    .filter(isDirectory)
    .map(source => relative(libs, source));
}

function generateLib(lib: string) {
  return {
    output: resolve(__dirname, `../libs/${lib}/src/lib/generated/graphql.ts`),
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

async function run() {
  const libs = listLibs();

  try {
    const config: Types.Config = {
      require: ['ts-node/register/transpile-only'],
      schema: resolve(__dirname, '../server/src/schema/schema.graphql'),
      overwrite: true,
      generates: {}
    };
    const libConfigs = await Promise.all(libs.map(generateLib));

    libConfigs.forEach(lib => {
      config.generates[lib.output] = lib.config;
    });

    await generate(config, true);

    process.exit(0);
  } catch (e) {
    console.error(e.details || e);
    process.exit(1);
  }
}

run();
