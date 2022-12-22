import {
  BehaviorSubject,
  distinctUntilChanged,
  map,
  Observable,
  Subject,
  throttleTime,
} from 'rxjs';

export const jsonCompare = <T>(prev: T, curr: T) =>
  JSON.stringify(prev) === JSON.stringify(curr);

/**
 * Class to isolate all state management boilerplate
 */
export class StateBaseService<T> {
  private initialState: T;
  private refreshSubject = new Subject<void>();
  protected refresh$ = this.refreshSubject
    .asObservable()
    .pipe(throttleTime(1000));

  protected state$: BehaviorSubject<T>;
  protected get state(): T {
    return this.state$.value;
  }

  constructor(initialState: T) {
    this.state$ = new BehaviorSubject(initialState);
    this.initialState = initialState;
  }

  protected setState(newState: Partial<T>) {
    this.state$.next({
      ...this.state,
      ...newState,
    });
  }

  protected select<K>(mapFn: (state: T) => K): Observable<K> {
    return this.state$.asObservable().pipe(
      map((state: T) => mapFn(state)),
      distinctUntilChanged(jsonCompare)
    );
  }

  protected refresh() {
    this.setState(this.initialState);
    this.refreshSubject.next();
  }
}
