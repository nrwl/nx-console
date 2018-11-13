import { generate } from 'graphql-code-generator';
import { resolve } from 'path';

const schema = resolve(__dirname, '../server/src/schema/schema.ts');
const output = resolve(__dirname, '../server/src/graphql-types.ts');

generate(
  {
    require: ['ts-node/register/transpile-only'],
    schema,
    overwrite: true,
    generates: {
      [output]: {
        plugins: [
          'typescript-common',
          'typescript-server'
        ]
      },
    }
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
