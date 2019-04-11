import { LocationChangeListener, PlatformLocation } from '@angular/common';
import { Inject, Injectable, Optional } from '@angular/core';
import * as url from 'url';

function parseUrl(
  urlStr: string
): { pathname: string; search: string; hash: string } {
  const parsedUrl = url.parse(urlStr);
  return {
    pathname: parsedUrl.pathname || '',
    search: parsedUrl.search || '',
    hash: parsedUrl.hash || ''
  };
}

@Injectable()
export class InMemoryPlatformLocation implements PlatformLocation {
  readonly pathname: string = '/';
  readonly search: string = '';
  readonly hash: string = '';

  constructor(@Optional() @Inject('INITIAL_PATHNAME') pathname: string) {
    if (pathname) {
      (this as { pathname: string }).pathname = pathname;
    }
  }

  getBaseHrefFromDOM(): string {
    // Always return the same base href since we will never set it in document.
    return '/';
  }

  onPopState(_fn: LocationChangeListener) {
    // This will not happen since there is no external source that pushes events to us.
  }

  onHashChange(_fn: LocationChangeListener) {
    // Hash events will never happen in this implementation.
  }

  get url(): string {
    return `${this.pathname}${this.search}${this.hash}`;
  }

  replaceState(_state: any, _title: string, newUrl: string) {
    const parsedUrl = parseUrl(newUrl);
    (this as { pathname: string }).pathname = parsedUrl.pathname;
    (this as { search: string }).search = parsedUrl.search;
  }

  pushState(state: any, title: string, newUrl: string) {
    this.replaceState(state, title, newUrl);
  }

  forward() {
    throw new Error('Not implemented (just use Router.navigate())');
  }

  back() {
    throw new Error('Not implemented (just use Router.navigate())');
  }
}
