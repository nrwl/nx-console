import { buildSchema } from 'graphql';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const schema = buildSchema(
  readFileSync(resolve(__dirname, './schema.graphql'), { encoding: 'utf-8' })
);
