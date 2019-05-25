import { Docs } from './docs';
import { readFirst } from '@nrwl/angular/testing';
import { of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

describe('Docs', () => {
  describe('workspaceDocs', () => {
    it('should return an empty array when nothing is provided', async done => {
      const d = new Docs();
      expect(await readFirst(d.workspaceDocs({}))).toEqual([]);
      done();
    });

    it('should return the combined result', async done => {
      const d = new Docs();
      d.addProvider({
        workspaceDocs: () => of([{ id: '1', description: 'd1' }]),
        schematicDocs: () => of([]),
        openDoc: () => of(false)
      });
      d.addProvider({
        workspaceDocs: () => of([{ id: '2', description: 'd2' }]),
        schematicDocs: () => of([]),
        openDoc: () => of(false)
      });

      expect(await readFirst(d.workspaceDocs({ a: '1.1' }))).toEqual([
        { id: '1', description: 'd1' },
        { id: '2', description: 'd2' }
      ]);

      done();
    });

    it('should ignore exceptions', async done => {
      const d = new Docs();
      d.addProvider({
        workspaceDocs: () => {
          throw new Error(`Boom`);
        },
        schematicDocs: () => of([]),
        openDoc: () => of(false)
      });
      d.addProvider({
        workspaceDocs: () => of([{ id: '2', description: 'd2' }]),
        schematicDocs: () => of([]),
        openDoc: () => of(false)
      });

      expect(await readFirst(d.workspaceDocs({ a: '1.1' }))).toEqual([
        { id: '2', description: 'd2' }
      ]);

      done();
    });
  });

  describe('schematicDocs', () => {
    it('should return an empty array when nothing is provided', async done => {
      const d = new Docs();
      expect(
        await readFirst(d.schematicDocs('collection', '1.1', 'name'))
      ).toEqual([]);
      done();
    });

    it('should return the combined result', async () => {
      const d = new Docs();
      d.addProvider({
        workspaceDocs: () => of([]),
        schematicDocs: () => of([{ id: '1', description: 'd1' }]),
        openDoc: () => of(false)
      });
      d.addProvider({
        workspaceDocs: () => of([]),
        schematicDocs: () => of([{ id: '2', description: 'd2' }]),
        openDoc: () => of(false)
      });

      expect(
        await readFirst(d.schematicDocs('collection', '1.1', 'name'))
      ).toEqual([
        { id: '1', description: 'd1' },
        { id: '2', description: 'd2' }
      ]);
    });

    it('should ignore exceptions', async () => {
      const d = new Docs();
      d.addProvider({
        workspaceDocs: () => of([]),
        schematicDocs: () => {
          throw new Error(`Boom`);
        },
        openDoc: () => of(false)
      });
      d.addProvider({
        workspaceDocs: () => of([]),
        schematicDocs: () => of([{ id: '2', description: 'd2' }]),
        openDoc: () => of(false)
      });

      expect(
        await readFirst(d.schematicDocs('collection', '1.1', 'name'))
      ).toEqual([{ id: '2', description: 'd2' }]);
    });
  });

  describe('openDoc', () => {
    it('should invoke openDoc until "true"', async done => {
      const openInvocations = [] as number[];
      const d = new Docs();
      d.addProvider({
        workspaceDocs: () => of([]),
        schematicDocs: () => of([]),
        openDoc: () => of(false).pipe(tap(() => openInvocations.push(1)))
      });
      d.addProvider({
        workspaceDocs: () => of([]),
        schematicDocs: () => of(),
        openDoc: () => of(true).pipe(tap(() => openInvocations.push(2)))
      });
      d.addProvider({
        workspaceDocs: () => of([]),
        schematicDocs: () => of(),
        openDoc: () => of(false).pipe(tap(() => openInvocations.push(3)))
      });

      await readFirst(d.openDoc('someid'));

      expect(openInvocations).toEqual([1, 2]);
      done();
    });

    it('should ignore errors', async done => {
      const openInvocations = [] as number[];
      const d = new Docs();
      d.addProvider({
        workspaceDocs: () => of([]),
        schematicDocs: () => of([]),
        openDoc: () =>
          of(false).pipe(
            map(() => {
              throw new Error('BOOM');
            })
          )
      });
      d.addProvider({
        workspaceDocs: () => of([]),
        schematicDocs: () => of(),
        openDoc: () => of(true).pipe(tap(() => openInvocations.push(2)))
      });

      await readFirst(d.openDoc('someid'));

      expect(openInvocations).toEqual([2]);
      done();
    });
  });
});
