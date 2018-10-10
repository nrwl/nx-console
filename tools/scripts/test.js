process.env.NODE_ENV = 'test';

const jest = require('jest');

const argv = process.argv.slice(2);

if (process.env.CI) {
  argv.push('--maxWorkers=1')
} else {
  argv.push('--watch')
}

jest.run(argv);
