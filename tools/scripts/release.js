/**
 * Local release entrypoint.
 *
 * Cuts a release for a single package off the latest `master` using local git
 * auth: bumps the version, creates and pushes the `<pkg>-v<version>` tag, and
 * creates the GitHub Release (whose notes carry the changelog). Publishing the
 * package itself is left to the `publish-<pkg>` workflow, which is triggered by
 * the GitHub Release and gated behind the `release-approval` environment.
 *
 *   node tools/scripts/release.js <package>
 */
const { execSync, execFileSync } = require('child_process');
const { getPreflightErrors } = require('./release-preflight');

// vscode + intellij version through @theunderscorer/nx-semantic-release;
// nxls + nx-mcp version through `nx release`. Both emit the same
// `chore(release-<pkg>): <version>` commit and a `<pkg>-v<version>` tag.
const TOOL_BY_PACKAGE = {
  vscode: 'semantic-release',
  intellij: 'semantic-release',
  nxls: 'nx-release',
  'nx-mcp': 'nx-release',
};

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function main() {
  const cliArgs = process.argv.slice(2);
  const dryRun = cliArgs.includes('--dry-run');
  const pkg = cliArgs.find((arg) => !arg.startsWith('-'));
  if (!pkg || !TOOL_BY_PACKAGE[pkg]) {
    fail(
      `Usage: node tools/scripts/release.js <package> [--dry-run]\n` +
        `  packages: ${Object.keys(TOOL_BY_PACKAGE).join(', ')}`,
    );
  }

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

  // Both release tools create the GitHub Release and read the token from the
  // environment. Source it from the local `gh` CLI so no PAT is needed.
  let githubToken;
  try {
    githubToken = execSync('gh auth token', { encoding: 'utf8' }).trim();
  } catch {
    fail('Could not read a GitHub token. Run `gh auth login` first.');
  }
  const env = {
    ...process.env,
    GITHUB_TOKEN: githubToken,
    GH_TOKEN: githubToken,
  };

  const tool = TOOL_BY_PACKAGE[pkg];
  console.log(
    `▶ ${dryRun ? 'Dry-run release of' : 'Releasing'} '${pkg}' via ${tool}...`,
  );

  const args =
    tool === 'semantic-release'
      ? ['nx', 'run', `${pkg}:semantic-release`]
      : ['nx', 'release', '--projects', pkg, '--skip-publish'];
  if (dryRun) {
    args.push('--dry-run');
  }

  try {
    execFileSync('npx', args, { stdio: 'inherit', env });
  } catch {
    fail(`Release of '${pkg}' failed.`);
  }

  // The git tag is the single source of truth for versions. `nx release`
  // still writes the bumped version into manifests on disk while versioning;
  // discard that so nothing version-related is ever committed back to source.
  const touched = execSync('git status --porcelain --untracked-files=no', {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3));
  if (touched.length > 0) {
    console.log(`Discarding on-disk version bumps: ${touched.join(', ')}`);
    execFileSync(
      'git',
      ['restore', '--staged', '--worktree', '--', ...touched],
      { stdio: 'inherit' },
    );
  }

  console.log(
    dryRun
      ? `✅ Dry run complete for '${pkg}' — no tag or GitHub Release was created.`
      : `✅ '${pkg}' released. The publish-${pkg} workflow runs once the GitHub Release deployment is approved.`,
  );
}

main();
