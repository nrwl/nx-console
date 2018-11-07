import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { first, map } from 'rxjs/operators';
import {
  OpenWorkspaceGQL,
  GetDirectoryPathGQL,
  GetDirectoryPath
} from './generated/graphql';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WorkspacesService {
  constructor(
    private readonly openWorkspaceGQL: OpenWorkspaceGQL,
    private readonly router: Router,
    private readonly getDirectoryPathGQL: GetDirectoryPathGQL
  ) {}

  openWorkspace(path: string) {
    // this query is just a smoke check
    this.openWorkspaceGQL
      .fetch({
        path
      })
      .pipe(first())
      .subscribe(() => {
        this.router.navigate(['/workspace', path]);
      });
  }

  selectDirectoryForNewWorkspace(): Observable<GetDirectoryPath.SelectDirectory | null> {
    return this.getDirectoryPathGQL
      .mutate({
        dialogTitle: 'Select a parent directory for your new workspace',
        dialogButtonLabel: 'Create workspace here',
        angularWorkspace: false
      })
      .pipe(
        map(r =>
          r.data
            ? (r.data.selectDirectory as GetDirectoryPath.SelectDirectory)
            : null
        ),
        first()
      );
  }

  selectExistingWorkspace(): Observable<GetDirectoryPath.SelectDirectory | null> {
    return this.getDirectoryPathGQL
      .mutate({
        dialogTitle: 'Select an Angular workspace directory',
        dialogButtonLabel: 'Select workspace',
        angularWorkspace: true
      })
      .pipe(
        map(r =>
          r.data
            ? (r.data.selectDirectory as GetDirectoryPath.SelectDirectory)
            : null
        ),
        first()
      );
  }
}
