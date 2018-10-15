import { generate } from 'graphql-code-generator';
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

function generateForLib(lib: string) {
  return generate(
    {
      require: ['ts-node/register/transpile-only'],
      schema: resolve(__dirname, '../server/src/schema/schema.ts'),
      skipSchema: true,
      template: 'graphql-codegen-apollo-angular-template',
      out: resolve(__dirname, `../libs/${lib}/src/lib/generated/graphql.ts`),
      overwrite: true,
      args: [`libs/${lib}/src/lib/graphql/**/*.graphql`]
    },
    true
  );
}

async function run() {
  const libs = listLibs();

  try {
    await Promise.all(libs.map(generateForLib));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
