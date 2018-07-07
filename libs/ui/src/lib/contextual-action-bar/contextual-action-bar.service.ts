import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

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
  readonly breadcrumbs$ = new BehaviorSubject<Array<Breadcrumb>>([]);

  readonly contextualActions$ = new BehaviorSubject<ContextualActions | null>(
    null
  );

  readonly close = new Subject<void>();
}
