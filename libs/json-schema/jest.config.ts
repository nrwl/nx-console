/* eslint-disable */
export default {
  displayName: 'json-schema',

  globals: {
    'ts-jest': { tsconfig: '<rootDir>/tsconfig.spec.json' },
  },
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/json-schema',
  testEnvironment: 'node',
  preset: '../../jest.preset.js',
};
