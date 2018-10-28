import { Doc } from '../graphql-types';
import { Observable, of } from 'rxjs';
import { catchError, concatMap, reduce, takeWhile } from 'rxjs/operators';

export interface DocsProvider {
  workspaceDocs(dependencies: { [depName: string]: string }): Observable<Doc[]>;
  schematicDocs(
    collectionName: string,
    collectionVersion: string | null,
    name: string
  ): Observable<Doc[]>;
  openDoc(id: string): Observable<boolean>;
}

class EmptyDocsProvider implements DocsProvider {
  workspaceDocs(dependencies: { [p: string]: string }): Observable<Doc[]> {
    return of([]);
  }

  schematicDocs(
    collectionName: string,
    collectionVersion: string | null,
    name: string
  ): Observable<Doc[]> {
    return of([]);
  }

  openDoc(id: string): Observable<boolean> {
    return of(false);
  }
}

export class Docs implements DocsProvider {
  private providers: DocsProvider[] = [new EmptyDocsProvider()];

  addProvider(docProvider: DocsProvider) {
    this.providers.push(docProvider);
  }

  workspaceDocs(dependencies: {
    [depName: string]: string;
  }): Observable<Doc[]> {
    return this.collectInfoFromProviders(p => p.workspaceDocs(dependencies));
  }

  schematicDocs(
    collectionName: string,
    collectionVersion: string | null,
    name: string
  ): Observable<Doc[]> {
    return this.collectInfoFromProviders(p =>
      p.schematicDocs(collectionName, collectionVersion, name)
    );
  }

  openDoc(id: string): Observable<boolean> {
    return of(...this.providers).pipe(
      concatMap(p =>
        p.openDoc(id).pipe(
          catchError(e => {
            console.log(`error`, e.message);
            return of(false);
          })
        )
      ),
      takeWhile(r => !r),
      reduce((m, c) => c, false)
    );
  }

  private collectInfoFromProviders(
    callback: (d: DocsProvider) => Observable<Doc[]>
  ): Observable<Doc[]> {
    return of(...this.providers).pipe(
      concatMap(d => {
        try {
          return callback(d).pipe(
            catchError(e => {
              console.log(`error`, e.message);
              return [];
            })
          );
        } catch (e) {
          console.log(`error`, e.message);
          return of([]);
        }
      }),
      reduce((m, c) => [...m, ...c], [] as Doc[])
    );
  }
}

export const docs = new Docs();
