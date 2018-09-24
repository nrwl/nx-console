import * as express from 'express';
import * as path from 'path';

export const app: express.Express = express();

const root = path.join(__dirname, 'public');
app.get('/workspaces', (req, res) => {
  res.sendFile('index.html', { root });
});

app.get('/workspace/*', (req, res) => {
  res.sendFile('index.html', { root });
});

// workspaces
app.use(express.static(root));

export function start(port: number) {
  app.listen(port ? port : 9999);
}

if (process.argv[3]) {
  start(+process.argv[3]);
}
