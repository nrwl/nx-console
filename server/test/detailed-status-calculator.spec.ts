import { BuildDetailedStatusCalculator } from '../src/api/detailed-status-calculator';

describe('detailedStatusCalculator', () => {
  describe('BuildDetailedStatusCalculator', () => {
    it('should start with an empty state', () => {
      const c = createCalculator();
      expect(c.detailedStatus).toEqual({
        watchStatus: 'success',
        date: '',
        time: '',
        chunks: [],
        errors: []
      });
    });

    it('should set the status to "inprogress" while keeping the rest of the state as is', () => {
      const c = createCalculator();
      c.detailedStatus.date = 'some date';
      c.addOut('progress is being made');
      expect(c.detailedStatus.date).toEqual('some date');
      expect(c.detailedStatus.watchStatus).toEqual('inprogress');
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
        watchStatus: 'success',
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
        watchStatus: 'success',
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
        watchStatus: 'success',
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
        watchStatus: 'failure',
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

    function createCalculator() {
      return new BuildDetailedStatusCalculator();
    }
  });
});
