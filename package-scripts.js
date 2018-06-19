const npsUtils = require('nps-utils');

module.exports = {
  scripts: {
    frontend: {
      ng: 'ng',
      serve: 'ng serve nxui'
    },
    server: {
      'compile': 'tsc -p server/tsconfig.json',
      'start': 'node dist/out-tsc/server',
      'up': npsUtils.series.nps('server.compile', 'server.start')
    },
    all: {
      up: npsUtils.concurrent.nps('server.up', 'frontend.serve')
    }
  }
};
