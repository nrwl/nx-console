const { readFileSync } = require('fs');
const path = require('path');

module.exports = {
  '/graphql': {
    target: "http://localhost:7777",
    secure: false
  }
};
