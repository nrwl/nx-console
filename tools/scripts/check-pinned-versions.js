const { readFileSync } = require('fs');
const { join } = require('path');

const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8')
);

const violations = [];

for (const section of ['dependencies', 'devDependencies']) {
  for (const [name, version] of Object.entries(pkg[section] || {})) {
    if (version.startsWith('^') || version.startsWith('~')) {
      violations.push(`  ${section} > ${name}: ${version}`);
    }
  }
}

if (violations.length > 0) {
  console.error(
    'Found unpinned dependency versions (^ or ~ ranges):\n' +
      violations.join('\n')
  );
  console.error(
    '\nAll dependencies must use exact versions. Remove the ^ or ~ prefix.'
  );
  process.exit(1);
}

console.log('All dependency versions are pinned.');
