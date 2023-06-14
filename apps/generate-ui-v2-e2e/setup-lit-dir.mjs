import fs from 'fs-extra';
import { schema } from './src/test-schema.mjs';

fs.copySync('../../dist/apps/generate-ui-v2', './dist/generate-ui-v2');

fs.createFileSync('./dist/generate-ui-v2/index.html');
fs.writeFileSync(
  './dist/generate-ui-v2/index.html',
  `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Generate UI</title>
      <link href="output.css" rel="stylesheet">
    </head>
    <body>
    <script src="api.js"></script>

    <script type="module" src="main.js"></script>
    <root-element></root-element>
    </body>
    </html>
`
);

fs.createFileSync('./dist/generate-ui-v2/api.js');
fs.writeFileSync(
  './dist/generate-ui-v2/api.js',
  `
  const postToWebviewCallbacks = [];

  window.intellijApi = {
    postToWebview(message) {
      console.log('posting message to webview', message);
      postToWebviewCallbacks.forEach((callback) => callback(message));
    },
    postToIde(message) {
      const messageParsed = JSON.parse(message);
      console.log('received', messageParsed);
      if (messageParsed.payloadType === 'output-init') {
        window.intellijApi?.postToWebview({
          payloadType: 'generator',
          payload: ${JSON.stringify(schema)},
        });
      }
    },
    registerPostToWebviewCallback(callback) {
      console.log('registering post to webview callback', callback);
      postToWebviewCallbacks.push(callback);
    },
  };
`
);
