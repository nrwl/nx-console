import { makeExecutableSchema } from 'apollo-server-express';
import { resolvers } from './resolvers';
import { typeDefs } from './type-defs';

// TODO(jack): Marking this as any for now until type issues can be resolved.
export const schema = makeExecutableSchema({
  resolvers,
  typeDefs
} as any);
