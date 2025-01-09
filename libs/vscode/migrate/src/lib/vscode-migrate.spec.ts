import { vscodeMigrate } from './vscode-migrate';

describe('vscodeMigrate', () => {
  it('should work', () => {
    expect(vscodeMigrate()).toEqual('vscode-migrate');
  });
});
