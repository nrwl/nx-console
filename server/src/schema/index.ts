import { makeExecutableSchema } from 'apollo-server-express';
import { resolvers } from './resolvers';
import { typeDefs } from './type-defs';

export const schema = makeExecutableSchema({
  resolvers: resolvers as any,
  typeDefs
});
