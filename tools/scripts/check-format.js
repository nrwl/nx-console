const sh = require('shelljs');
const fs = require('fs');

const r = sh.exec(
  './node_modules/.bin/prettier --list-different {apps,libs}/**/*.{ts,css,scss,html}'
);
if (r.code !== 0) {
  console.error('Prettier check failed. Run yarn start format');
  process.exit(1);
}

const errors = [];

[...ls('apps'), ...ls('libs'), ...ls('tools')].forEach(f => {
  const textFile =
    f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.json');
  if (
    textFile &&
    fs
      .readFileSync(f)
      .toString()
      .indexOf('\r\n') > -1
  ) {
    errors.push(f);
  }
});

if (errors.length > 0) {
  console.error(
    `The following files have CRLF line endings. Please only use LF.`
  );
  console.error(errors.join('\n'));
  process.exit(1);
}

function ls(dir) {
  return sh.ls('-R', dir).map(f => `${dir}/${f}`);
}
