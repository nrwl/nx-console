import * as express from 'express';
import * as cors from 'cors';
import { ApolloServer } from 'apollo-server-express';
import { schema } from './schema';

const apollo = new ApolloServer({
  schema,
  rootValue: global
});

export const app: express.Express = express();

apollo.applyMiddleware({
  app,
  path: '/graphql',
  bodyParserConfig: true
});

export function start(port: number, frontendPort?: number) {
  if (frontendPort) {
    app.use(
      cors({
        origin: `http://localhost:${frontendPort}`,
        optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
      })
    );
  }
  app.listen(port ? port : 7777);
}

if (process.argv[2]) {
  start(+process.argv[2]);
}
