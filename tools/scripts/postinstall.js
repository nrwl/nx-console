const { writeFileSync, readFileSync } = require('fs');

writeFileSync(`./node_modules/source-map-explorer/vendor/webtreemap.css`, '');
writeFileSync(
  `./node_modules/source-map-explorer/index.js`,
  readFileSync('./node_modules/source-map-explorer/index.js', 'utf-8').replace(
    '#!/usr/bin/env node',
    ''
  )
);
