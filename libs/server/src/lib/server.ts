import {
  createSchema,
  registerPlugin,
  authUtils,
  Store
} from '@nrwl/angular-console-enterprise-electron';
import {
  ApolloServer,
  mergeSchemas,
  makeExecutableSchema
} from 'apollo-server-express';
import * as express from 'express';

import { docs } from './api/docs';
import { readSettings } from './api/read-settings';
import { commands } from './api/run-command';
import { Telemetry } from './telemetry';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getResolvers } from './resolvers';

export const app: express.Express = express();

// workspaces

export function start(options: {
  port: number;
  store: Store;
  authenticatorFactory: () => authUtils.AuthenticatorFactory;
  mainWindow: any;
  staticResourcePath: string;
}) {
  const context = {
    readSettings,
    commands,
    docs,
    telemetry: new Telemetry(options.store)
  };

  const schema = makeExecutableSchema({
    resolvers: getResolvers(options.mainWindow, options.store),
    typeDefs: readFileSync(resolve(__dirname, './assets/schema.graphql'), {
      encoding: 'utf-8'
    })
  } as any);

  const apollo = new ApolloServer({
    schema: mergeSchemas({
      schemas: [
        schema,
        createSchema(context, options.store, options.authenticatorFactory)
      ]
    }),
    rootValue: global
  });

  apollo.applyMiddleware({
    app,
    path: '/graphql',
    bodyParserConfig: true
  });

  app.get('/workspaces', (req, res) => {
    res.sendFile('index.html', { root: options.staticResourcePath });
  });

  app.get('/workspace/*', (req, res) => {
    res.sendFile('index.html', { root: options.staticResourcePath });
  });

  app.use(express.static(options.staticResourcePath));

  registerPlugin(context, options.store);

  return app.listen(options.port);
}
