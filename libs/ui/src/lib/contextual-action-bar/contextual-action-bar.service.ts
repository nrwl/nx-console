import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

export interface Breadcrumb {
  title: string;
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

@Injectable({
  providedIn: 'root'
})
export class ContextualActionBarService {
  readonly breadcrumbs$ = new BehaviorSubject<Array<Breadcrumb>>([]);

  readonly contextualActions$ = new Subject<ContextualActions | null>();
}
