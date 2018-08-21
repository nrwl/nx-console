import { makeExecutableSchema } from 'apollo-server-express';
import { resolvers } from './resolvers';
import { typeDefs } from './schema';

export const schema = makeExecutableSchema({
  resolvers,
  typeDefs,
});
