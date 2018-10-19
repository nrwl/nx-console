import {
  StatusType,
  BuildDetailedStatusCalculator,
  TestDetailedStatusCalculator
} from '../../src/api/detailed-status-calculator';

describe('detailedStatusCalculator', () => {
  describe('BuildDetailedStatusCalculator', () => {
    it('should start with an empty state', () => {
      const c = createCalculator();
      expect(c.detailedStatus).toEqual({
        type: StatusType.BUILD,
        buildStatus: 'build_inprogress',
        progress: 0,
        date: '',
        time: '',
        chunks: [],
        errors: []
      });
    });

    it('should set the status to "build_inprogress" while keeping the rest of the state as is', () => {
      const c = createCalculator();
      c.addOut('0% compiling');
      expect(c.detailedStatus.buildStatus).toEqual('build_inprogress');
    });

    it('tracks progress', () => {
      const c = createCalculator();
      c.detailedStatus.date = 'some date';
      c.addOut(`
        10% building modules 3/3 modules 0 active
        10% building modules 10/15 modules 0 active
        11% building modules 23/37 modules 0 active
        15% building modules 30/37 modules 0 active
      `);

      expect(c.detailedStatus.progress).toEqual(15);
    });

    it('should set the chunks when build is successful', () => {
      const c = createCalculator();
      c.addOut(`
        Date: 2018-09-23T19:46:04.026Z
        Hash: 157327758919213b9320
        Time: 16477ms
        chunk {main} main.js, main.js.map (main) 381 kB [initial] [rendered]
        chunk {polyfills} polyfills.js, polyfills.js.map (polyfills) 237 kB [initial] [rendered]
        chunk {runtime} runtime.js, runtime.js.map (runtime) 5.22 kB [entry] [rendered]
        chunk {styles} styles.js, styles.js.map (styles) 86 kB [initial] [rendered]
        chunk {vendor} vendor.js, vendor.js.map (vendor) 7.57 MB [initial] [rendered]      
      `);

      expect(c.detailedStatus).toEqual({
        type: StatusType.BUILD,
        buildStatus: 'build_success',
        progress: 100,
        date: '2018-09-23T19:46:04.026Z',
        time: '16477ms',
        chunks: [
          { name: 'main', file: 'main.js', size: '381 kB', type: 'initial' },
          {
            name: 'polyfills',
            file: 'polyfills.js',
            size: '237 kB',
            type: 'initial'
          },
          {
            name: 'runtime',
            file: 'runtime.js',
            size: '5.22 kB',
            type: 'entry'
          },
          { name: 'styles', file: 'styles.js', size: '86 kB', type: 'initial' },
          {
            name: 'vendor',
            file: 'vendor.js',
            size: '7.57 MB',
            type: 'initial'
          }
        ],
        errors: []
      });
    });

    it('should handle ansi characters', () => {
      const c = createCalculator();
      c.addOut(`      
        Hash: a47cd7d40c3a7f374b97
        chunk \u001b[30m{main} main.js, main.js.map (main) 381 kB [initial] [rendered]    
      `);

      expect(c.detailedStatus).toEqual({
        type: StatusType.BUILD,
        buildStatus: 'build_success',
        progress: 100,
        date: '',
        time: '',
        chunks: [
          { name: 'main', file: 'main.js', size: '381 kB', type: 'initial' }
        ],
        errors: []
      });
    });

    it('should set the errors when build is not successful', () => {
      const c = createCalculator();
      c.addOut(`      
        Hash: a47cd7d40c3a7f374b97
        chunk {main} main.js, main.js.map (main) 381 kB [initial] [rendered]    
      `);

      expect(c.detailedStatus).toEqual({
        type: StatusType.BUILD,
        buildStatus: 'build_success',
        progress: 100,
        date: '',
        time: '',
        chunks: [
          { name: 'main', file: 'main.js', size: '381 kB', type: 'initial' }
        ],
        errors: []
      });

      c.addOut(`
        ERROR in apps/myproject/src/app/app.module.ts(6,40): error TS2307: Cannot find module './reduc1ers'.
        apps/myproject/src/main.ts(4,1): error TS2304: Cannot find name 'require'.   
      `);

      expect(c.detailedStatus).toEqual({
        type: StatusType.BUILD,
        buildStatus: 'build_failure',
        progress: 100,
        date: '',
        time: '',
        chunks: [
          { name: 'main', file: 'main.js', size: '381 kB', type: 'initial' }
        ],
        errors: [
          `apps/myproject/src/app/app.module.ts(6,40): error TS2307: Cannot find module './reduc1ers'.`,
          `apps/myproject/src/main.ts(4,1): error TS2304: Cannot find name 'require'.`
        ]
      });
    });

    it('retains error status after additional output', () => {
      const c = createCalculator();

      c.addOut(`
        ERROR in apps/myproject/src/app/app.module.ts(6,40): error TS2307: Cannot find module './reduc1ers'.
        apps/myproject/src/main.ts(4,1): error TS2304: Cannot find name 'require'.   
      `);

      c.addOut(`
        Date: 2018-10-11T16:39:09.280Z - Hash: ad1d4410fb348ff46e8b - Time: 6230ms
        4 unchanged chunks
        chunk {main} main.js, main.js.map (main) 12.7 kB [initial] [rendered]
      `);

      expect(c.detailedStatus.buildStatus).toEqual('build_failure');
    });

    it('stores server information', () => {
      const c = createCalculator();
      c.addOut(`
        ** Angular Live Development Server is listening on localhost:4200, open your browser on http://localhost:4200/ **
      `);

      expect(c.detailedStatus.serverPort).toEqual(4200);
    });

    it('handles host and port errors', () => {
      const c = createCalculator();
      c.addOut(`
        Port 4200 is already in use
      `);
      expect(c.detailedStatus.errors).toEqual(['Port 4200 is already in use']);
      c.addOut(`
        getaddrinfo ENOTFOUND localhost1
      `);
      expect(c.detailedStatus.errors).toEqual([
        'getaddrinfo ENOTFOUND localhost1'
      ]);
    });

    function createCalculator() {
      return new BuildDetailedStatusCalculator({
        cwd: '',
        isForProduction: false,
        architectOptions: null
      });
    }
  });

  describe('TestDetailedStatusCalculator', () => {
    it('maintains build status', () => {
      const c = createCalculator();

      c.addOut(`
 0% compiling
`);
      expect(c.detailedStatus.buildProgress).toEqual(0);

      c.addOut(`
 10% building modules 0/1 modules 1 active ...s/example/apps/example/src/polyfills.ts
 10% building modules 1/1 modules 0 active
 34% building modules 207/207 modules 0 active
`);
      expect(c.detailedStatus.buildProgress).toEqual(34);

      c.addOut(`
 73% basic module optimization
 95% emitting CopyPlugin
 
 12 10 2018 09:38:46.582:INFO [Chrome 69.0.3497 (Mac OS X 10.13.6)]: Connected on socket Ixaj7Z6_OEy0UWM0AAAA with id 19077706
`);
      expect(c.detailedStatus.buildProgress).toEqual(100);
    });

    it('stores final result', () => {
      const c = createCalculator();

      c.addOut(`
TOTAL: 1 FAILED, 3 SUCCESS
`);
      expect(c.detailedStatus.failure).toEqual(1);
      expect(c.detailedStatus.success).toEqual(3);
      expect(c.detailedStatus.total).toEqual(4);
      expect(c.detailedStatus.testStatus).toEqual('test_failure');

      c.addOut(`
TOTAL: 4 SUCCESS
`);
      expect(c.detailedStatus.failure).toEqual(0);
      expect(c.detailedStatus.success).toEqual(4);
      expect(c.detailedStatus.total).toEqual(4);
      expect(c.detailedStatus.testStatus).toEqual('test_success');
    });

    it('tracks progress', () => {
      const c = createCalculator();
      c.addOut(`
12 10 2018 11:29:56.015:INFO [Chrome 69.0.3497 (Mac OS X 10.13.6)]: Connected on socket 6OEMBuHli9ZUtjOQAAAA with id 44537180
Chrome 69.0.3497 (Mac OS X 10.13.6): Executed 1 of 4 SUCCESS (0 secs / 0.005 secs)
`);

      expect(c.detailedStatus.testStatus).toEqual('test_inprogress');
      expect(c.detailedStatus.total).toEqual(4);
      expect(c.detailedStatus.success).toEqual(1);
      expect(c.detailedStatus.failure).toEqual(0);

      c.addOut(`
Chrome 69.0.3497 (Mac OS X 10.13.6): Executed 2 of 4 SUCCESS (0 secs / 0.005 secs)
Chrome 69.0.3497 (Mac OS X 10.13.6): Executed 3 of 4 (1 FAILED) (0 secs / 4.104 secs)
Chrome 69.0.3497 (Mac OS X 10.13.6): Executed 4 of 4 (1 FAILED) (4.149 secs / 4.122 secs)
TOTAL: 1 FAILED, 3 SUCCESS
`);
      expect(c.detailedStatus.testStatus).toEqual('test_failure');
      expect(c.detailedStatus.total).toEqual(4);
      expect(c.detailedStatus.success).toEqual(3);
      expect(c.detailedStatus.failure).toEqual(1);
    });

    it('collects unique errors', () => {
      const c = createCalculator();
      c.addOut(`Chrome 69.0.3497 (Mac OS X 10.13.6) AppComponent should render title in a h1 tag FAILED
\tExpected 'Hello!' to contain 'Hellos!'.
\t    at Object.eval (webpack:///./src/app/app.component.spec.ts?:83:70)
\t    at step (webpack:///./src/app/app.component.spec.ts?:32:23)
\t    at Object.eval [as next] (webpack:///./src/app/app.component.spec.ts?:13:53)
\t    at fulfilled (webpack:///./src/app/app.component.spec.ts?:4:58)
Chrome 69.0.3497 (Mac OS X 10.13.6): Executed 3 of 4 (1 FAILED) (0 secs / 4.157 secs)
Chrome 69.0.3497 (Mac OS X 10.13.6) AppComponent should render title in a h1 tag FAILED
\tExpected 'Hello!' to contain 'Hellos!'.
\t    at Object.eval (webpack:///./src/app/app.component.spec.ts?:83:70)
\t    at step (webpack:///./src/app/app.component.spec.ts?:32:23)
\t    at Object.eval [as next] (webpack:///./src/app/app.component.spec.ts?:13:53)
\t    at fulfilled (webpack:///./src/app/app.component.spec.ts?:4:58)`);
      c.addOut(
        `Chrome 69.0.3497 (Mac OS X 10.13.6): Executed 4 of 4 (1 FAILED) (0 secs / 4.187 secs)`
      );
      c.addOut(
        `Chrome 69.0.3497 (Mac OS X 10.13.6): Executed 4 of 4 (1 FAILED) (4.25 secs / 4.187 secs)`
      );
      c.addOut(`TOTAL: 1 FAILED, 3 SUCCESS
TOTAL: 1 FAILED, 3 SUCCESS
`);

      expect(c.detailedStatus.testStatus).toEqual('test_failure');
      expect(c.detailedStatus.errors).toEqual([
        {
          label: 'AppComponent should render title in a h1 tag',
          details: `Expected 'Hello!' to contain 'Hellos!'.
  at Object.eval (webpack:///./src/app/app.component.spec.ts?:83:70)
  at step (webpack:///./src/app/app.component.spec.ts?:32:23)
  at Object.eval [as next] (webpack:///./src/app/app.component.spec.ts?:13:53)
  at fulfilled (webpack:///./src/app/app.component.spec.ts?:4:58)
Expected 'Hello!' to contain 'Hellos!'.
  at Object.eval (webpack:///./src/app/app.component.spec.ts?:83:70)
  at step (webpack:///./src/app/app.component.spec.ts?:32:23)
  at Object.eval [as next] (webpack:///./src/app/app.component.spec.ts?:13:53)
  at fulfilled (webpack:///./src/app/app.component.spec.ts?:4:58)
`
        }
      ]);
    });

    function createCalculator() {
      return new TestDetailedStatusCalculator();
    }
  });
});
