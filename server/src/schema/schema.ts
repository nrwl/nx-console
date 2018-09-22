import { buildASTSchema } from 'graphql';
import { typeDefs } from './type-defs';

export const schema = buildASTSchema(typeDefs);
