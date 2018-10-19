import { Injectable } from '@angular/core';
import { OpenInBrowserGQL } from './generated/graphql';

@Injectable({
  providedIn: 'root'
})
export class OpenInBrowserService {
  constructor(private readonly openInBrowserGQL: OpenInBrowserGQL) {}

  openUrl(url: string) {
    return this.openInBrowserGQL
      .mutate({
        url
      })
      .subscribe(() => {});
  }
}
