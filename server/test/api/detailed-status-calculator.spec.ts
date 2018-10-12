import { BuildDetailedStatusCalculator } from '../../src/api/detailed-status-calculator';

describe('detailedStatusCalculator', () => {
  describe('BuildDetailedStatusCalculator', () => {
    it('should start with an empty state', () => {
      const c = createCalculator();
      expect(c.detailedStatus).toEqual({
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
      c.detailedStatus.date = 'some date';
      c.addOut('0% compiling');

      expect(c.detailedStatus.date).toEqual('some date');
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

    function createCalculator() {
      return new BuildDetailedStatusCalculator();
    }
  });
});
