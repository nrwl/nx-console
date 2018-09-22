import { generate } from 'graphql-code-generator';
import { resolve } from 'path';

generate(
  {
    require: ['ts-node/register/transpile-only'],
    schema: resolve(__dirname, 'src/schema/schema.ts'),
    template: 'graphql-codegen-typescript-template',
    out: resolve(__dirname, 'src/graphql-types.ts'),
    overwrite: true
  },
  true
)
  .then(_ => {
    process.exit(0);
  })
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
