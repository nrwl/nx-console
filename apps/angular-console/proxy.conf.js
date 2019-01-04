const { readFileSync } = require('fs');
const path = require('path');

module.exports = {
  '/graphql': {
    target: 'http://localhost:4201',
    secure: false
  }
};
