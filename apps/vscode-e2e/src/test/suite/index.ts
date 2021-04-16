import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

import * as tsConfig  from '../../../../../tsconfig.base.json';
import * as tsConfigPaths from 'tsconfig-paths';

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});

	// const testsRoot = path.resolve(__dirname, '..');
  const testsRoot = path.resolve('./dist/apps/vscode-e2e/src/test');
  console.log('testsRoot', testsRoot);

	return new Promise((c, e) => {
		glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
			if (err) {
				return e(err);
			}

			// Add files to the test suite
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

      // register tsconfig paths
      const baseUrl = './';
      console.log('baseUrl', path.resolve(baseUrl));
      let cleanup;

			try {
        cleanup = tsConfigPaths.register({
          baseUrl,
          paths: tsConfig.compilerOptions.paths
        });

				// Run the mocha test
				mocha.run(failures => {
					if (failures > 0) {
						e(new Error(`${failures} tests failed.`));
					} else {
						c();
					}
				});
			} catch (err) {
				console.error(err);
				e(err);
			} finally {
        // When path registration is no longer needed
        cleanup && cleanup();
      }
		});
	});
}
