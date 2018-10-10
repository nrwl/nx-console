import { RecentCommands } from '../../src/api/commands';

describe('RecentCommands', () => {
  it('should set all the fields correctly', () => {
    const r = new RecentCommands(3);
    r.addCommand(
      'type',
      'id',
      'workspace',
      'command',
      () => {},
      createStatusCalculator()
    );

    const c = r.commandInfos[0];
    expect(c.id).toEqual('id');
    expect(c.workspace).toEqual('workspace');
    expect(c.command).toEqual('command');
  });

  it('should remove a completed command when going over the limit', () => {
    const r = new RecentCommands(3);
    r.addCommand(
      'type',
      'command1',
      '',
      '',
      () => {},
      createStatusCalculator()
    );
    r.restartCommand('command1');
    r.addCommand(
      'type',
      'command2',
      '',
      '',
      () => {},
      createStatusCalculator()
    );
    r.restartCommand('command2');
    r.addCommand(
      'type',
      'command3',
      '',
      '',
      () => {},
      createStatusCalculator()
    );
    r.restartCommand('command3');
    r.setFinalStatus('command2', 'successful');
    r.addCommand(
      'type',
      'command4',
      '',
      '',
      () => {},
      createStatusCalculator()
    );
    r.restartCommand('command4');

    expect(r.commandInfos.map(c => c.id)).toEqual([
      'command4',
      'command3',
      'command1'
    ]);
  });

  it('should throw an exception when there no completed commands when going over the limit', () => {
    const r = new RecentCommands(2);
    r.addCommand(
      'type',
      'command1',
      '',
      '',
      () => {},
      createStatusCalculator()
    );
    r.addCommand(
      'type',
      'command2',
      '',
      '',
      () => {},
      createStatusCalculator()
    );

    expect(() =>
      r.addCommand(
        'type',
        'command3',
        '',
        '',
        () => {},
        createStatusCalculator()
      )
    ).toThrowError('Cannot run more than 2 commands in parallel');
  });

  it('should remove a command', () => {
    const r = new RecentCommands(2);
    const kill = jasmine.createSpy();
    r.addCommand(
      'type',
      'command1',
      '',
      '',
      () => ({ kill }),
      createStatusCalculator()
    );
    r.restartCommand('command1');
    r.addCommand(
      'type',
      'command2',
      '',
      '',
      () => {},
      createStatusCalculator()
    );
    r.removeCommand('command1');

    expect(kill).toHaveBeenCalled();
    expect(r.commandInfos.map(c => c.id)).toEqual(['command2']);
  });

  it('should set status', () => {
    const r = new RecentCommands(2);
    r.addCommand(
      'type',
      'command1',
      '',
      '',
      () => {},
      createStatusCalculator()
    );
    r.setFinalStatus('command1', 'successful');

    expect(r.commandInfos[0].status).toEqual('successful');
  });

  it('should add out', () => {
    const r = new RecentCommands(2);
    r.addCommand(
      'type',
      'command1',
      '',
      '',
      () => {},
      createStatusCalculator()
    );
    r.addCommand(
      'type',
      'command2',
      '',
      '',
      () => {},
      createStatusCalculator()
    );
    r.addOut('command2', 'one');
    r.addOut('command2', 'two');

    expect(r.commandInfos[0].out).toEqual('onetwo');
    expect(r.commandInfos[0].outChunk).toEqual('onetwo');
  });

  it('should invoke calculator when adding out and setting status', () => {
    const r = new RecentCommands(2);
    const calculator = createStatusCalculator();
    r.addCommand('type', 'command1', '', '', () => {}, calculator);
    r.addOut('command1', 'one');
    expect(calculator.addOut).toHaveBeenCalledWith('one');

    r.setFinalStatus('command1', 'success');
    expect(calculator.setStatus).toHaveBeenCalledWith('success');
  });

  function createStatusCalculator() {
    return {
      addOut: jasmine.createSpy(),
      setStatus: jasmine.createSpy(),
      detailedStatus: jasmine.createSpy()
    };
  }
});
