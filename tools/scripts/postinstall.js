const fs = require('fs');

fs.writeFileSync(
  `./node_modules/source-map-explorer/vendor/webtreemap.css`,
  ''
);
fs.writeFileSync(
  `./node_modules/source-map-explorer/index.js`,
  fs
    .readFileSync('./node_modules/source-map-explorer/index.js')
    .toString()
    .replace('#!/usr/bin/env node', '')
);
