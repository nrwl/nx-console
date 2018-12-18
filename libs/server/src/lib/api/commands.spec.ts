import { Commands } from '../../src/api/commands';

describe('Commands', () => {
  describe('add command', () => {
    it('should set all the fields correctly', () => {
      const r = new Commands(1, 1);
      r.addCommand(
        'type',
        'id',
        'workspace',
        'command',
        () => {},
        createStatusCalculator()
      );

      const c = r.recent[0];
      expect(c.id).toEqual('id');
      expect(c.workspace).toEqual('workspace');
      expect(c.command).toEqual('command');
    });

    it('should not store the record in recent when addToRecent if false', () => {
      const r = new Commands(1, 1);
      r.addCommand(
        'type',
        'id',
        'workspace',
        'command',
        () => {},
        createStatusCalculator(),
        false
      );

      expect(r.history[0]).toBeDefined();
      expect(r.recent[0]).toBeUndefined();
    });

    it('should store the same record in history', () => {
      const r = new Commands(1, 1);
      r.addCommand(
        'type',
        'id',
        'workspace',
        'command',
        () => {},
        createStatusCalculator()
      );

      expect(r.recent[0]).toBe(r.history[0]);
    });

    it('should remove the oldest record from history when going over the limit', () => {
      const r = new Commands(2, 1);
      r.addCommand(
        'type',
        'command1',
        'workspace',
        'command',
        () => {},
        createStatusCalculator()
      );

      r.addCommand(
        'type',
        'command2',
        'workspace',
        'command',
        () => {},
        createStatusCalculator()
      );

      expect(r.history[0].id).toBe('command2');
    });

    it('should remove a completed command from "recent" when going over the limit', () => {
      const r = new Commands(3, 5);
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
      r.addCommand(
        'type',
        'command3',
        '',
        '',
        () => {},
        createStatusCalculator()
      );
      r.setStatus('command2', 'successful');
      r.addCommand(
        'type',
        'command4',
        '',
        '',
        () => {},
        createStatusCalculator()
      );

      expect(r.recent.map(c => c.id)).toEqual([
        'command1',
        'command3',
        'command4'
      ]);

      expect(r.history.map(c => c.id)).toEqual([
        'command1',
        'command2',
        'command3',
        'command4'
      ]);
    });

    it('should throw an exception when there no completed commands in "recent" when going over the limit', () => {
      const r = new Commands(2, 3);
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
  });

  describe('restart', () => {
    it('should reuse the slot in recent, but add a new one to history', () => {
      const r = new Commands(1, 2);
      r.addCommand(
        'type',
        'command1',
        '',
        '',
        () => {},
        createStatusCalculator()
      );
      r.addOut('command1', 'someout');
      r.setStatus('command1', 'successful');
      r.restartCommand('command1');
      expect(r.recent[0].id).toEqual('command1');
      expect(r.history[0].id).toEqual('command1');
      expect(r.history[0].out).toEqual('someout');
      expect(r.history[1].id).toEqual('command1');
      expect(r.history[1].out).toEqual('');
    });
  });

  describe('remove command', () => {
    it('should remove a command from recent, but not from history', () => {
      const r = new Commands(2, 3);
      const kill = jasmine.createSpy();
      r.addCommand(
        'type',
        'command1',
        '',
        '',
        () => ({ kill }),
        createStatusCalculator()
      );
      r.setStatus('command1', 'in-progress');
      r.startCommand('command1');
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
      expect(r.recent.map(c => c.id)).toEqual(['command2']);
      expect(r.history.map(c => c.id)).toEqual(['command1', 'command2']);
    });
  });

  describe('addOut and setStatus', () => {
    it('should set status', () => {
      const r = new Commands(1, 1);
      r.addCommand(
        'type',
        'command1',
        '',
        '',
        () => {},
        createStatusCalculator()
      );
      r.setStatus('command1', 'successful');

      expect(r.recent[0].status).toEqual('successful');
    });

    it('should add out', () => {
      const r = new Commands(2, 2);
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

      expect(r.recent[1].out).toEqual('onetwo');
      expect(r.recent[1].outChunk).toEqual('onetwo');
    });

    it('should invoke calculator when adding out and setting status', () => {
      const r = new Commands(1, 1);
      const calculator = createStatusCalculator();
      r.addCommand('type', 'command1', '', '', () => {}, calculator);
      r.addOut('command1', 'one');
      expect(calculator.addOut).toHaveBeenCalledWith('one');

      r.setStatus('command1', 'successful');
      expect(calculator.setStatus).toHaveBeenCalledWith('successful');
    });
  });

  function createStatusCalculator() {
    return {
      addOut: jasmine.createSpy(),
      setStatus: jasmine.createSpy(),
      reset: jasmine.createSpy(),
      detailedStatus: jasmine.createSpy()
    };
  }
});
