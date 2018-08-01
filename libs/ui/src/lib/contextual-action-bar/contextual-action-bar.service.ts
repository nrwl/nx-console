import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface Breadcrumb {
  title: string;
}

export interface NonContextualAction {
  description: string;
  icon: string;
  invoke: () => void;
}

export interface ContextualAction {
  name: string;
  invoke: Subject<void>;
  disabled: Subject<boolean>;
}

export interface ContextualActions {
  contextTitle: string;
  actions: Array<ContextualAction>;
}

export interface ContextualTab {
  name: string;
  icon: string;
  routerLink: any[] | string;
}

export interface ContextualTabs {
  tabs: Array<ContextualTab>;
}

@Injectable({
  providedIn: 'root'
})
export class ContextualActionBarService {
  readonly breadcrumbs$ = new BehaviorSubject<Array<Breadcrumb>>([]);

  readonly nonContextualActions$ = new BehaviorSubject<
    Array<NonContextualAction>
  >([]);

  readonly contextualActions$ = new Subject<ContextualActions | null>();

  readonly contextualTabs$ = new BehaviorSubject<ContextualTabs | null>(null);
}
