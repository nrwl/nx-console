module.exports = {
  displayName: 'vscode-json-schema',

  globals: {
    'ts-jest': { tsconfig: '<rootDir>/tsconfig.spec.json' },
  },
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../../coverage/libs/vscode/json-schema',
  testEnvironment: 'node',
  preset: '../../../jest.preset.ts',
};
