// Fails on purpose to exercise CI failure reporting. Do not merge.
describe('intentional CI failure', () => {
  it('fails on purpose (second run)', () => {
    expect('the value the code returned').toBe('the value the test expected');
  });
});
