import * as express from 'express';
import * as path from 'path';
import { ApolloServer } from 'apollo-server-express';
import {
  directoryExists,
  filterByName,
  findClosestNg,
  findExecutable,
  listFiles,
  readJsonFile
} from './utils';
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
