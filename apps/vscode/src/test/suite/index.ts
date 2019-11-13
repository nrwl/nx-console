import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'fast-glob';

export async function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    timeout: 120000
  });
  mocha.useColors(true);

  const testsRoot = path.resolve(__dirname, '..');
  const files = await glob('**/**.test.js', { cwd: testsRoot });

  files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

  return new Promise((res, rej) => {
    try {
      // Run the mocha test
      mocha.run(failures => {
        if (failures > 0) {
          rej(new Error(`${failures} tests failed.`));
        } else {
          res();
        }
      });
    } catch (err) {
      rej(err);
    }
  });
}
