import { RecentCommands } from '../../src/api/commands';

describe('RecentCommands', () => {
  it('should set all the fields correctly', () => {
    const r = new RecentCommands(3);
    r.addCommand('type', 'id', 'workspace', 'command', () => {});

    const c = r.commandInfos[0];
    expect(c.id).toEqual('id');
    expect(c.workspace).toEqual('workspace');
    expect(c.command).toEqual('command');
  });

  it('should remove a completed command when going over the limit', () => {
    const r = new RecentCommands(3);
    r.addCommand('type', 'command1', '', '', () => {});
    r.restartCommand('command1');
    r.addCommand('type', 'command2', '', '', () => {});
    r.restartCommand('command2');
    r.addCommand('type', 'command3', '', '', () => {});
    r.restartCommand('command3');
    r.setFinalStatus('command2', 'success');
    r.addCommand('type', 'command4', '', '', () => {});
    r.restartCommand('command4');

    expect(r.commandInfos.map(c => c.id)).toEqual([
      'command1',
      'command3',
      'command4'
    ]);
  });

  it('should throw an exception when there no completed commands when going over the limit', () => {
    const r = new RecentCommands(2);
    r.addCommand('type', 'command1', '', '', () => {});
    r.addCommand('type', 'command2', '', '', () => {});

    expect(() =>
      r.addCommand('type', 'command3', '', '', () => {})
    ).toThrowError('Cannot run more than 2 commands in parallel');
  });

  it('should remove a command', () => {
    const r = new RecentCommands(2);
    const kill = jasmine.createSpy();
    r.addCommand('type', 'command1', '', '', () => ({ kill }));
    r.restartCommand('command1');
    r.addCommand('type', 'command2', '', '', () => {});
    r.removeCommand('command1');

    expect(kill).toHaveBeenCalled();
    expect(r.commandInfos.map(c => c.id)).toEqual(['command2']);
  });

  it('should set status', () => {
    const r = new RecentCommands(2);
    r.addCommand('type', 'command1', '', '', () => {});
    r.setFinalStatus('command1', 'success');

    expect(r.commandInfos[0].status).toEqual('success');
  });

  it('should add out', () => {
    const r = new RecentCommands(2);
    r.addCommand('type', 'command1', '', '', () => {});
    r.addCommand('type', 'command2', '', '', () => {});
    r.addOut('command2', 'one');
    r.addOut('command2', 'two');

    expect(r.commandInfos[1].out).toEqual('onetwo');
    expect(r.commandInfos[1].outChunk).toEqual('onetwo');
  });
});
