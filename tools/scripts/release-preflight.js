const { execSync } = require('child_process');

/**
 * Pure check: given the local git state, return human-readable reasons a
 * release should be blocked. An empty array means the state is releasable.
 *
 * @param {{ branch: string, uncommittedFileCount: number, behindCount: number }} state
 * @returns {string[]}
 */
function getPreflightErrors({ branch, uncommittedFileCount, behindCount }) {
  const errors = [];
  if (branch !== 'master') {
    errors.push(
      `Releases must run from 'master' (current branch: '${branch}'). Run: git checkout master`,
    );
  }
  if (uncommittedFileCount > 0) {
    errors.push(
      `Working tree has ${uncommittedFileCount} uncommitted change(s). Commit or stash them first.`,
    );
  }
  if (behindCount > 0) {
    errors.push(
      `Local 'master' is ${behindCount} commit(s) behind 'origin/master'. Run: git pull`,
    );
  }
  return errors;
}

module.exports = { getPreflightErrors };

if (require.main === module) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
    }).trim();
    const uncommittedFileCount = execSync(
      'git status --porcelain --untracked-files=no',
      { encoding: 'utf8' },
    )
      .split('\n')
      .filter(Boolean).length;
    execSync('git fetch origin master --quiet');
    const behindCount = Number(
      execSync('git rev-list --count HEAD..origin/master', {
        encoding: 'utf8',
      }).trim(),
    );

    const errors = getPreflightErrors({
      branch,
      uncommittedFileCount,
      behindCount,
    });
    if (errors.length > 0) {
      console.error('❌ Release preflight failed:');
      for (const error of errors) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }

    console.log(
      "✅ Release preflight passed: on the latest 'master' with a clean working tree.",
    );
  } catch (error) {
    console.error('❌ Release preflight: unable to inspect git state.');
    console.error(
      'Make sure you are in a git repository and git is installed.',
    );
    console.error(error.message);
    process.exit(1);
  }
}
