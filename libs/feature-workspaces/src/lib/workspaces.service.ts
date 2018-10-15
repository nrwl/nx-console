import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { OpenWorkspaceGQL } from './generated/graphql';

@Injectable({
  providedIn: 'root'
})
export class WorkspacesService {
  constructor(
    private readonly openWorkspaceGQL: OpenWorkspaceGQL,
    private readonly router: Router
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
}
