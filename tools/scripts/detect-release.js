const { execSync } = require('child_process');
const fs = require('fs');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string[]} commitSubjects commit subject lines, newest-first
 * @param {string} packageName e.g. 'vscode', 'nxls', 'nx-mcp'
 * @returns {{ shouldPublish: boolean, version: string | null }}
 */
function detectRelease(commitSubjects, packageName) {
  const pattern = new RegExp(
    `^chore\\(release-${escapeRegex(packageName)}\\): (\\S+)`,
  );
  for (const subject of commitSubjects) {
    const match = subject.match(pattern);
    if (match) {
      return { shouldPublish: true, version: match[1] };
    }
  }
  return { shouldPublish: false, version: null };
}

module.exports = { detectRelease };

if (require.main === module) {
  const packageName = process.argv[2];
  if (!packageName) {
    console.error('Usage: node detect-release.js <package-name>');
    process.exit(1);
  }

  const before = process.env.BEFORE;
  const after = process.env.AFTER || 'HEAD';
  const hasValidBefore = before && !/^0+$/.test(before);
  const range = hasValidBefore ? `${before}..${after}` : `${after}~1..${after}`;

  const log = execSync(`git log --format=%s ${range}`, { encoding: 'utf8' });
  const subjects = log.split('\n').filter(Boolean);

  const { shouldPublish, version } = detectRelease(subjects, packageName);
  console.log(
    `Detected for "${packageName}": should-publish=${shouldPublish}, version=${
      version ?? ''
    }`,
  );

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `should-publish=${shouldPublish}\nversion=${version ?? ''}\n`,
    );
  }
}
