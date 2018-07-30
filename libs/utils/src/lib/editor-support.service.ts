import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { map, publishReplay, refCount } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EditorSupport {
  private readonly editors$: Observable<{ name: string; icon: string }>;

  constructor(private readonly apollo: Apollo) {
    this.editors$ = this.apollo
      .query({
        query: gql`
          {
            editors {
              name
              icon
            }
          }
        `
      })
      .pipe(
        map((r: any) => r.data.editors),
        publishReplay(1),
        refCount()
      );
  }

  get editors() {
    return this.editors$;
  }

  openInEditor(editor: string, path: string) {
    this.apollo
      .mutate({
        mutation: gql`
          mutation($editor: String!, $path: String!) {
            openInEditor(editor: $editor, path: $path) {
              response
            }
          }
        `,
        variables: {
          editor,
          path
        }
      })
      .subscribe(e => {});
  }
}
