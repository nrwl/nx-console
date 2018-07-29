const { readFileSync } = require('fs');
const path = require('path');

module.exports = {
  '/graphql': {
    target: "http://localhost:8888",
    secure: false
  }
};
