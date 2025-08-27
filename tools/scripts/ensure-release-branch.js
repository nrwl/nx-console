const { execSync } = require('child_process');

try {
    // Get the current branch name
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf8'
    }).trim();

    // Define the expected release branch name
    const releaseBranch = 'release';

    console.log(`Current branch: ${currentBranch}`);

    if (currentBranch !== releaseBranch) {
        console.error(`❌ Error: You must be on the '${releaseBranch}' branch to proceed.`);
        console.error(`Current branch is '${currentBranch}'.`);
        console.error(`Please switch to the release branch with: git checkout ${releaseBranch}`);
        process.exit(1);
    }

    console.log(`✅ Confirmed: You are on the '${releaseBranch}' branch.`);
} catch (error) {
    console.error('❌ Error: Unable to determine current git branch.');
    console.error('Make sure you are in a git repository and git is installed.');
    console.error(error.message);
    process.exit(1);
}


