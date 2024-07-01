const { execSync } = require('child_process');

console.log('checking formatting...');
try {
  execSync('npx nx format:check', { stdio: 'ignore' });
} catch (e) {
  console.error('nx format:check failed');
  process.exit(1);
}

const changedFiles = execSync('git diff --cached --name-only', {
  encoding: 'utf-8',
}).split('\n');

const ktFiles = changedFiles.filter((file) => file.endsWith('.kt'));

if (ktFiles.length > 0) {
  console.log('Detected .kt files, running ktfmtCheck...');
  try {
    execSync('npx nx run intellij:ktfmtCheck', {
      stdio: 'ignore',
    });
  } catch (e) {
    console.error('ktfmtCheck failed');
    process.exit(1);
  }
}
