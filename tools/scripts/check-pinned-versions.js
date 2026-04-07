const { readFileSync } = require('fs');
const { join } = require('path');

const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'),
);

const violations = [];

for (const section of ['dependencies', 'devDependencies']) {
  for (const [name, version] of Object.entries(pkg[section] || {})) {
    if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z-.]+)?(\+[0-9A-Za-z-.]+)?$/.test(version)) {
      violations.push(`  ${section} > ${name}: ${version}`);
    }
  }
}

if (violations.length > 0) {
  console.error(
    'Found unpinned dependency versions (must be exact semver):\n' +
      violations.join('\n'),
  );
  console.error(
    '\nAll dependencies must use exact versions. Remove the ^ or ~ prefix.',
  );
  process.exit(1);
}

console.log('All dependency versions are pinned.');
