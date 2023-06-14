const fs = require('fs-extra');

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

<script type="module" src="main.js"></script>
<root-element></root-element>
</body>
</html>

`
);
