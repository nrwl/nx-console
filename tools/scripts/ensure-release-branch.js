const { execSync } = require('child_process');

function isAllowedReleaseBranch(branchName) {
  return branchName === 'release' || branchName.startsWith('release-');
}

module.exports = { isAllowedReleaseBranch };

if (require.main === module) {
  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
    }).trim();

    console.log(`Current branch: ${currentBranch}`);

    if (!isAllowedReleaseBranch(currentBranch)) {
      console.error(
        `❌ Error: You must be on the 'release' branch or a 'release-*' branch to proceed.`,
      );
      console.error(`Current branch is '${currentBranch}'.`);
      console.error(
        `Create a release branch with: git checkout release && git pull && git checkout -b release-<date>`,
      );
      process.exit(1);
    }

    console.log(
      `✅ Confirmed: You are on a release branch ('${currentBranch}').`,
    );
  } catch (error) {
    console.error('❌ Error: Unable to determine current git branch.');
    console.error(
      'Make sure you are in a git repository and git is installed.',
    );
    console.error(error.message);
    process.exit(1);
  }
}
