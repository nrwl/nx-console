import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { first, tap } from 'rxjs/operators';

export interface WorkspaceDescription {
  readonly path: string;
  readonly name: string;
  readonly favorite?: boolean;
}

interface SettingsData {
  readonly recent: WorkspaceDescription[];
  readonly canCollectData: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class Settings {
  private settings: SettingsData;

  constructor(private readonly apollo: Apollo) {}

  getRecentWorkspaces(favorite?: boolean): WorkspaceDescription[] {
    const all: WorkspaceDescription[] = this.settings.recent || [];
    switch (favorite) {
      case undefined:
        return all;
      case false:
        return all.filter(w => !w.favorite);
      case true:
        return all.filter(w => w.favorite);
    }
  }

  toggleFavorite(w: WorkspaceDescription): void {
    const r = this.getRecentWorkspaces().filter(rr => rr.path !== w.path);
    const favorite: WorkspaceDescription = { ...w, favorite: !w.favorite };
    this.store({ ...this.settings, recent: [favorite, ...r] });
  }

  addRecent(w: WorkspaceDescription): void {
    if (
      this.getRecentWorkspaces().filter(rr => rr.path === w.path).length === 0
    ) {
      this.store({ ...this.settings, recent: [w, ...this.settings.recent] });
    }
  }

  removeRecent(w: WorkspaceDescription): void {
    const r = this.getRecentWorkspaces().filter(rr => rr.path !== w.path);
    this.store({ ...this.settings, recent: [...r] });
  }

  canCollectData(): boolean | undefined {
    return this.settings.canCollectData;
  }

  setCanCollectData(canCollectData: boolean): void {
    this.store({ ...this.settings, canCollectData });
  }

  fetch() {
    return this.apollo
      .query({
        query: gql`
          {
            settings {
              canCollectData
              recent {
                path
                name
                favorite
              }
            }
          }
        `
      })
      .pipe(
        first(),
        tap(r => {
          this.settings = (r.data as any).settings;
        })
      );
  }

  private store(v: SettingsData) {
    this.settings = v;
    this.apollo
      .mutate({
        mutation: gql`
          mutation($data: String!) {
            updateSettings(data: $data) {
              canCollectData
              recent {
                path
                name
                favorite
              }
            }
          }
        `,
        variables: { data: JSON.stringify(v) }
      })
      .subscribe(r => {
        this.settings = r.data as any;
      });
  }
}
