import { Injectable } from '@angular/core';
import { map, publishReplay, refCount } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { EditorsGQL, OpenInEditorGQL } from './generated/graphql';

@Injectable({
  providedIn: 'root'
})
export class EditorSupport {
  private readonly editors$: Observable<Array<{ name: string; icon: string }>>;

  constructor(
    private readonly editorsGQL: EditorsGQL,
    private readonly openInEditorGQL: OpenInEditorGQL
  ) {
    this.editors$ = this.editorsGQL.fetch().pipe(
      map(r => r.data.editors),
      publishReplay(1),
      refCount()
    );
  }

  get editors() {
    return this.editors$;
  }

  openInEditor(editor: string, path: string) {
    this.openInEditorGQL
      .mutate({
        editor,
        path
      })
      .subscribe(() => {});
  }
}
