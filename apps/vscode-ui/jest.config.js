module.exports = {
  name: 'vscode-ui',
  preset: '../../jest.config.js',
  coverageDirectory: '../../coverage/apps/vscode-ui',
  snapshotSerializers: [
    'jest-preset-angular/build/AngularNoNgAttributesSnapshotSerializer.js',
    'jest-preset-angular/build/AngularSnapshotSerializer.js',
    'jest-preset-angular/build/HTMLCommentSerializer.js',
  ],
};
