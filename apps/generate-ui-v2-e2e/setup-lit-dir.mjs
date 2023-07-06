import fs from 'fs-extra';

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
      <style>
      :root {
        --foreground-color: black;
      --background-color: white;
      --primary-color: blue;
      --error-color: red;
      --field-background-color: grey;
      --field-border-color: black;
      --select-field-background-color: grey;
      --active-selection-background-color: blue;
      --focus-border-color: blue;
      --banner-warning-color: red;
      --badge-background-color: grey;
      --separator-color: black;
      --field-nav-hover-color: grey;
      }
      </style>
    </head>
    <body>

    <script type="module" src="main.js"></script>
    <root-element></root-element>
    </body>
    </html>
`
);
