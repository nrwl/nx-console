import * as express from 'express';
import * as path from 'path';
import { ApolloServer, mergeSchemas } from 'apollo-server-express';
import { schema } from './schema';
import { createSchema } from '@nrwl/angular-console-enterprise-electron';

// TODO(jack): Temporarily get around type errors.
const apollo = new ApolloServer({
  schema: mergeSchemas({
    schemas: [schema, createSchema({})] as any
  }) as any,
  rootValue: global
});

export const app: express.Express = express();

apollo.applyMiddleware({
  app,
  path: '/graphql',
  bodyParserConfig: true
});

app.get('/workspaces', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

app.get('/workspace/*', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

// workspaces
app.use(express.static(path.join(__dirname, 'public')));

export function start(port: number) {
  app.listen(port ? port : 7777);
}

if (process.argv[2]) {
  start(+process.argv[2]);
}
