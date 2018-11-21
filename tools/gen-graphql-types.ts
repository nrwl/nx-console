import { generate } from 'graphql-code-generator';
import { resolve } from 'path';

const schema = resolve(__dirname, '../server/src/schema/schema.graphql');
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
          'typescript-server',
          'typescript-resolvers'
        ]
      }
    }
  },
  true
)
  .then(_ => {
    process.exit(0);
  })
  .catch(e => {
    console.error(e.details || e);
    process.exit(1);
  });
