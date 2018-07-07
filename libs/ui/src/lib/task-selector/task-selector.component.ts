import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSelectionList } from '@angular/material';
import { combineLatest, Observable, Subject } from 'rxjs';
import { map, startWith, take } from 'rxjs/operators';

import { ContextualActionBarService } from '../contextual-action-bar/contextual-action-bar.service';

export interface Task<T> {
  taskName: string;
  task: T;
}

export interface TaskCollection<T> {
  collectionName: string;
  tasks: Array<Task<T>>;
}

export interface TaskCollections<T> {
  taskCollections: Array<TaskCollection<T>>;
  selectedTask: Task<T> | null;
}

const ANIMATION_MILLIS = 600;

@Component({
  selector: 'ui-task-selector',
  templateUrl: './task-selector.component.html',
  styleUrls: ['./task-selector.component.scss'],
  animations: [
    trigger('growShrink', [
      state('void', style({ width: '240px' })),
      state('collapse', style({ width: '240px' })),
      state('expand', style({ width: '*' })),
      transition(
        `collapse <=> expand`,
        animate(`${ANIMATION_MILLIS}ms ease-in-out`)
      )
    ])
  ]
})
export class TaskSelectorComponent<T> implements OnInit, OnDestroy {
  @ViewChild(MatSelectionList) taskSelectionList: MatSelectionList;

  @Input() taskCollections$: Observable<TaskCollections<T>>;
  @Input() filterPlaceholder: string;

  @Output() readonly selectionChange = new EventEmitter<T | null>();

  taskFilterFormControl = new FormControl();
  filteredTaskCollections$: Observable<TaskCollections<T>>;
  taskAnimationState$ = new Subject<'collapse' | 'expand'>();

  private readonly contextActionCloseSubscription = this.contextActionService.close.subscribe(
    () => this.selectTask(null)
  );

  constructor(
    private readonly contextActionService: ContextualActionBarService
  ) {}

  ngOnInit() {
    // TODO: Remove this hack when material exposes this boolean as a public API.
    (this.taskSelectionList.selectedOptions as any)._multiple = false;

    this.taskCollections$.pipe(take(1)).subscribe(taskCollections => {
      if (taskCollections.selectedTask) {
        this.taskAnimationState$.next('collapse');
      } else {
        this.taskAnimationState$.next('expand');
      }
    });

    this.filteredTaskCollections$ = combineLatest(
      this.taskFilterFormControl.valueChanges.pipe(
        startWith(''),
        map(value => value.toLowerCase())
      ),
      this.taskCollections$
    ).pipe(
      map(([lowerCaseFilterValue, taskCollections]) => ({
        selectedTask: taskCollections.selectedTask,
        taskCollections: taskCollections.taskCollections.map(collection => ({
          collectionName: collection.collectionName,
          tasks: collection.tasks.filter(task =>
            task.taskName.toLowerCase().includes(lowerCaseFilterValue)
          )
        }))
      }))
    );
  }

  ngOnDestroy() {
    this.selectTask(null);
    this.contextActionCloseSubscription.unsubscribe();
  }

  trackByCollectionName(_: number, taskCollection: TaskCollection<T>) {
    return taskCollection.collectionName;
  }

  trackByTaskName(_: number, task: Task<T>) {
    return task.taskName;
  }

  selectTask(task: Task<T> | null) {
    if (task) {
      this.selectionChange.next(task.task);
      setTimeout(() => {
        this.taskAnimationState$.next('collapse');
      }, 300);
    } else {
      this.contextActionService.contextualActions$.next(null);
      this.taskAnimationState$.next('expand');
      setTimeout(() => {
        this.selectionChange.next(null);
      }, ANIMATION_MILLIS);
    }
  }
}
