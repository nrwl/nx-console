import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Breadcrumb {
  title: string;
}

export interface ContextualAction {
  name: string;
  icon: string;
  invoke: Subject<void>;
  disabled: Subject<boolean>;
}

export interface ContextualActions {
  contextTitle: string;
  actions: Array<ContextualAction>;
}

@Injectable({
  providedIn: 'root'
})
export class ContextualActionBarService {
  readonly breadcrumbs$ = new Subject<Array<Breadcrumb>>();

  readonly contextualActions$ = new Subject<ContextualActions | null>();
}
