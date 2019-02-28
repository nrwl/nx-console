import {
  StatusType,
  BuildDetailedStatusCalculator,
  TestDetailedStatusCalculator
} from './detailed-status-calculator';

describe('detailedStatusCalculator', () => {
  describe('BuildDetailedStatusCalculator', () => {
    it('should start with an empty state', () => {
      const c = createCalculator();
      expect(c.detailedStatus).toEqual({
        type: StatusType.BUILD,
        buildStatus: 'build_inprogress',
        progress: 0,
        indexFile: undefined,
        isForProduction: false,
        outputPath: undefined,
        serverHost: undefined,
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

      expect(c.detailedStatus).toEqual(
        expect.objectContaining({
          type: StatusType.BUILD,
          buildStatus: 'build_success',
          progress: 100,
          indexFile: undefined,
          isForProduction: false,
          outputPath: undefined,
          serverHost: undefined,
          date: '2018-09-23T19:46:04.026Z',
          time: '16.48s',
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
            {
              name: 'styles',
              file: 'styles.js',
              size: '86 kB',
              type: 'initial'
            },
            {
              name: 'vendor',
              file: 'vendor.js',
              size: '7.57 MB',
              type: 'initial'
            }
          ],
          errors: []
        })
      );
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
        indexFile: undefined,
        isForProduction: false,
        outputPath: undefined,
        serverHost: undefined,
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
        indexFile: undefined,
        isForProduction: false,
        outputPath: undefined,
        serverHost: undefined,
        serverPort: undefined,
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
        indexFile: undefined,
        isForProduction: false,
        outputPath: undefined,
        serverHost: undefined,
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

    it('clears errors when build restarts', () => {
      const c = createCalculator();

      c.addOut(`
        ERROR in apps/myproject/src/app/app.module.ts(6,40): error TS2307: Cannot find module './reduc1ers'.
        apps/myproject/src/main.ts(4,1): error TS2304: Cannot find name 'require'.
      `);

      c.addOut(`
        10% building modules 3/3 modules 0 active
        10% building modules 10/15 modules 0 active
        11% building modules 23/37 modules 0 active
        15% building modules 30/37 modules 0 active
      `);

      expect(c.detailedStatus.errors).toEqual([]);
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
        'Port 4200 is already in use',
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
Chrome 69.0.3497 (Mac OS X 10.13.6): Executed 4 of 4 (1 FAILED) (4.149 secs / 4.122 secs)
`);
      expect(c.detailedStatus.failure).toEqual(1);
      expect(c.detailedStatus.success).toEqual(3);
      expect(c.detailedStatus.total).toEqual(4);
      expect(c.detailedStatus.testStatus).toEqual('test_failure');

      c.addOut(`
Chrome 69.0.3497 (Mac OS X 10.13.6): Executed 4 of 4 (4.149 secs / 4.122 secs)
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
`);
      expect(c.detailedStatus.testStatus).toEqual('test_failure');
      expect(c.detailedStatus.total).toEqual(4);
      expect(c.detailedStatus.success).toEqual(3);
      expect(c.detailedStatus.failure).toEqual(1);
    });

    it('collects assertion errors', () => {
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

    it('collects compile errors', () => {
      const c = createCalculator();
      c.addOut(`Chrome 69.0.3497 (Mac OS X 10.13.6) AppComponent should render title in a h1 tag FAILED
\t'haha' is not a known element:
\t1. If 'haha' is an Angular component, then verify that it is part of this module.
\t2. To allow any element add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component. ("
\t  <h1>Hello!</h1>
\t  <example-hello></example-hello>
\t  [ERROR ->]<haha></haha>
\t</div>
\t"): ng:///DynamicTestModule/AppComponent.html@4:2
\tError: Template parse errors:
\t    at syntaxError (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:1275:17)
\t    at TemplateParser.parse (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:15084:19)
\t    at JitCompiler._parseTemplate (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24272:37)
\t    at JitCompiler._compileTemplate (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24259:23)
\t    at eval (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24202:62)
\t    at Set.forEach (<anonymous>)
\t    at JitCompiler._compileComponents (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24202:19)
\t    at eval (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24120:19)
\t    at Object.then (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:1266:77)
\t    at JitCompiler._compileModuleAndAllComponents (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24118:26)
\t'haha' is not a known element:
\t1. If 'haha' is an Angular component, then verify that it is part of this module.
\t2. To allow any element add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component. ("
\t  <h1>Hello!</h1>
\t  <example-hello></example-hello>
\t  [ERROR ->]<haha></haha>
\t</div>
\t"): ng:///DynamicTestModule/AppComponent.html@4:2
\tError: Template parse errors:
\t'haha' is not a known element:
\t1. If 'haha' is an Angular component, then verify that it is part of this module.
\t2. To allow any element add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component. ("
\t  <h1>Hello!</h1>
\t  <example-hello></example-hello>
\t  [ERROR ->]<haha></haha>
\t</div>
\t"): ng:///DynamicTestModule/AppComponent.html@4:2
\t    at syntaxError (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:1275:17)
\t    at TemplateParser.parse (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:15084:19)
\t    at JitCompiler._parseTemplate (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24272:37)
\t    at JitCompiler._compileTemplate (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24259:23)
\t    at eval (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24202:62)
\t    at Set.forEach (<anonymous>)
\t    at JitCompiler._compileComponents (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24202:19)
\t    at eval (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24120:19)
\t    at Object.then (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:1266:77)
\t    at JitCompiler._compileModuleAndAllComponents (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24118:26)
\tError: Uncaught (in promise): Error: Template parse errors:
\t    at resolvePromise (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone.js?:813:31)
\t    at new ZoneAwarePromise (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone.js?:893:17)
\t    at __awaiter (webpack:///./src/app/app.component.spec.ts?:3:12)
\t    at UserContext.eval (webpack:///./src/app/app.component.spec.ts?:72:80)
\t    at ZoneDelegate.invoke (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone.js?:387:26)
\t    at AsyncTestZoneSpec.onInvoke (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone-testing.js?:712:39)
\t    at ProxyZoneSpec.onInvoke (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone-testing.js?:284:39)
\t    at ZoneDelegate.invoke (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone.js?:386:32)
\t    at Zone.runGuarded (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone.js?:150:47)
\t    at runInTestZone (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone-testing.js?:840:29)
Chrome 69.0.3497 (Mac OS X 10.13.6): Executed 4 of 4 (1 FAILED) (0 secs / 0.089 secs)
`);

      expect(c.detailedStatus.testStatus).toEqual('test_failure');
      expect(c.detailedStatus.errors).toEqual([
        {
          label: 'AppComponent should render title in a h1 tag',
          details: `'haha' is not a known element:
1. If 'haha' is an Angular component, then verify that it is part of this module.
2. To allow any element add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component. (\"
  <h1>Hello!</h1>
  <example-hello></example-hello>
  [ERROR ->]<haha></haha>
</div>
\"): ng:///DynamicTestModule/AppComponent.html@4:2
Error: Template parse errors:
  at syntaxError (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:1275:17)
  at TemplateParser.parse (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:15084:19)
  at JitCompiler._parseTemplate (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24272:37)
  at JitCompiler._compileTemplate (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24259:23)
  at eval (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24202:62)
  at Set.forEach (<anonymous>)
  at JitCompiler._compileComponents (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24202:19)
  at eval (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24120:19)
  at Object.then (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:1266:77)
  at JitCompiler._compileModuleAndAllComponents (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24118:26)
'haha' is not a known element:
1. If 'haha' is an Angular component, then verify that it is part of this module.
2. To allow any element add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component. (\"
  <h1>Hello!</h1>
  <example-hello></example-hello>
  [ERROR ->]<haha></haha>
</div>
\"): ng:///DynamicTestModule/AppComponent.html@4:2
Error: Template parse errors:
  at syntaxError (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:1275:17)
  at TemplateParser.parse (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:15084:19)
  at JitCompiler._parseTemplate (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24272:37)
  at JitCompiler._compileTemplate (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24259:23)
  at eval (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24202:62)
  at Set.forEach (<anonymous>)
  at JitCompiler._compileComponents (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24202:19)
  at eval (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24120:19)
  at Object.then (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:1266:77)
  at JitCompiler._compileModuleAndAllComponents (webpack:////Users/jack/projects/example/node_modules/@angular/compiler/fesm5/compiler.js?:24118:26)
Error: Uncaught (in promise): Error: Template parse errors:
  at resolvePromise (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone.js?:813:31)
  at new ZoneAwarePromise (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone.js?:893:17)
  at __awaiter (webpack:///./src/app/app.component.spec.ts?:3:12)
  at UserContext.eval (webpack:///./src/app/app.component.spec.ts?:72:80)
  at ZoneDelegate.invoke (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone.js?:387:26)
  at AsyncTestZoneSpec.onInvoke (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone-testing.js?:712:39)
  at ProxyZoneSpec.onInvoke (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone-testing.js?:284:39)
  at ZoneDelegate.invoke (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone.js?:386:32)
  at Zone.runGuarded (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone.js?:150:47)
  at runInTestZone (webpack:////Users/jack/projects/example/node_modules/zone.js/dist/zone-testing.js?:840:29)
`
        }
      ]);
    });

    it('captures compile errors', () => {
      const c = createCalculator();
      c.addOut(`
[./src/polyfills.ts] ./apps/example3/src/polyfills.ts 0 bytes {polyfills} [built]
[./src/styles.css] ./apps/example3/src/styles.css 1.25 KiB {styles} [built]
[./src/test.ts] ./apps/example3/src/test.ts 0 bytes {main} [built]

ERROR in apps/example3/src/app/app.component.ts(9,1): error TS1005: '{' expected.

30 10 2018 11:51:38.409:INFO [Chrome 69.0.3497 (Mac OS X 10.13.6)]: Connected on socket gFyQfESFrdxOxY_jAAAA with id 55160968`);

      expect(c.detailedStatus.testStatus).toEqual('build_failure');
    });

    it('resets errors when new run begins', () => {
      const c = createCalculator();

      c.addOut(
        `ERROR in apps/example3/src/app/app.component.ts(9,1): error TS1005: '{' expected.`
      );
      c.addOut(`Executed 0 of 4 SUCCESS`);

      expect(c.detailedStatus.buildErrors).toEqual([]);

      c.addOut(
        `ERROR in apps/example3/src/app/app.component.ts(9,1): error TS1005: '{' expected.`
      );
      c.addOut(`
        Executed 0 of 0 SUCCESS
        Executed 0 of 0 ERROR
      `);

      expect(c.detailedStatus.buildErrors).toEqual([
        "apps/example3/src/app/app.component.ts(9,1): error TS1005: '{' expected."
      ]);
    });

    function createCalculator() {
      return new TestDetailedStatusCalculator();
    }
  });
});
