import { makeExecutableSchema } from 'apollo-server-express';
import { resolvers } from './resolvers';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// TODO(jack): Marking this as any for now until type issues can be resolved.
export const schema = makeExecutableSchema({
  resolvers,
  typeDefs: readFileSync(resolve(__dirname, './schema.graphql'), {
    encoding: 'utf-8'
  })
} as any);
