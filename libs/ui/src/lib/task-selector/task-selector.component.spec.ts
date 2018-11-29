import { NO_ERRORS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, Observable } from 'rxjs';
import {
  TaskCollections,
  TaskSelectorComponent
} from './task-selector.component';

const TASKS: Observable<TaskCollections<Task>> = of({
  "selectedTask": null,
  "taskCollections": [
    {
      "collectionName": "@schematics/angular",
      "tasks": [
        {
          "taskName": "serviceWorker",
          "task": {
            "name": "serviceWorker",
            "description": "Initializes a service worker setup.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        },
        {
          "taskName": "application",
          "task": {
            "name": "application",
            "description": "Create an Angular application.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        },
        {
          "taskName": "class",
          "task": {
            "name": "class",
            "description": "Create a class.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        },
        {
          "taskName": "component",
          "task": {
            "name": "component",
            "description": "Create an Angular component.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        },
        {
          "taskName": "directive",
          "task": {
            "name": "directive",
            "description": "Create an Angular directive.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        },
        {
          "taskName": "enum",
          "task": {
            "name": "enum",
            "description": "Create an enumeration.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        },
        {
          "taskName": "guard",
          "task": {
            "name": "guard",
            "description": "Create a guard.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        },
        {
          "taskName": "interface",
          "task": {
            "name": "interface",
            "description": "Create an interface.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        },
        {
          "taskName": "module",
          "task": {
            "name": "module",
            "description": "Create an Angular module.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        },
        {
          "taskName": "pipe",
          "task": {
            "name": "pipe",
            "description": "Create an Angular pipe.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        },
        {
          "taskName": "service",
          "task": {
            "name": "service",
            "description": "Create an Angular service.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        },
        {
          "taskName": "universal",
          "task": {
            "name": "universal",
            "description": "Create an Angular universal app.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        },
        {
          "taskName": "appShell",
          "task": {
            "name": "appShell",
            "description": "Create an app shell.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        },
        {
          "taskName": "library",
          "task": {
            "name": "library",
            "description": "Generate a library project for Angular.",
            "collection": "@schematics/angular",
            "__typename": "Schematic"
          }
        }
      ]
    },
    {
      "collectionName": "@schematics/update",
      "tasks": [
        {
          "taskName": "update",
          "task": {
            "name": "update",
            "description": "Update one or multiple packages to versions, updating peer dependencies along the way.",
            "collection": "@schematics/update",
            "__typename": "Schematic"
          }
        }
      ]
    }
  ]
});

interface Task {
  name: string;
  description: string;
  collection: string;
  __typename: string;
}
const activatedRoute: any = {
  params: new Subject<any>(),
  parent: { params: new Subject<any>() },
  queryParams: new Subject<any>()
};

fdescribe('TaskSelectorComponent', () => {
  let component: TaskSelectorComponent<Task | {}>;
  let debugElement: HTMLElement;
  let fixture: ComponentFixture<TaskSelectorComponent<Task | {}>>;
  const taskCollections: Observable<TaskCollections<Task>> = TASKS;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TaskSelectorComponent],
      imports: [NoopAnimationsModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: activatedRoute
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskSelectorComponent);
    component = fixture.componentInstance;
    component.taskCollections$ = taskCollections;
    debugElement = fixture.debugElement.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update the taskFilterFormControl value when query param filter is set', async(() => {
    activatedRoute.queryParams.next({ filter: 'application' });
    fixture.detectChanges();

    expect(component.taskFilterFormControl.value).toBe('application');
  }));

  it('should not update the taskFilterFormControl value when query param is filter=NULL', async(() => {
    activatedRoute.queryParams.next({ filter: null });
    fixture.detectChanges();

    expect(component.taskFilterFormControl.value).toBeNull();
  }));
  
  it('should not update the taskFilterFormControl value when query param is filter=undefined', async(() => {
    activatedRoute.queryParams.next({ filter: undefined });
    fixture.detectChanges();

    expect(component.taskFilterFormControl.value).toBeNull();
  }));

  it('should not update the taskFilterFormControl value when query param is filter=<NUMBER>', async(() => {
    activatedRoute.queryParams.next({ filter: 123 });
    fixture.detectChanges();

    expect(component.taskFilterFormControl.value).toBeNull();
  }));

  it('should show collections of type "application" when query param is filter=application', fakeAsync(() => {
    activatedRoute.queryParams.next({ filter: 'application' });
    fixture.detectChanges();

    expect(debugElement.querySelectorAll('mat-nav-list.task-list > mat-list-item').length).toBe(1);

    const collectionHtmlTitle: HTMLHeadElement|null = debugElement.querySelector('mat-nav-list > div > h3');

    // avoiding TS2531: Object is possibly 'null'
    if (collectionHtmlTitle) {
      expect(collectionHtmlTitle.textContent).toMatch('@schematics/angular');
    }
    else {
      throw new Error('Element "mat-nav-list > div > h3" is not present in the DOM.');
    }

    const taskHtmlTitle: HTMLHeadElement|null = debugElement.querySelector('mat-nav-list.task-list > mat-list-item > h3');
    
    // avoiding TS2531: Object is possibly 'null'
    if (taskHtmlTitle) {
      expect(taskHtmlTitle.textContent).toMatch('application');
    }
    else {
      throw new Error('Element "mat-nav-list > mat-list-item > h3" is not present in the DOM.');
    }

    // TODO(wassim): checking the data model always returns the whole collection!
    // component.filteredTaskCollections$.subscribe(result => {
    //   expect(result.taskCollections[0].collectionName).toBe('@schematics/angular');
    //   expect(result.taskCollections.length).toBe(1);
    // });
  }));


  fit('should show an empty collection of tasks when query param is filter=xxx', fakeAsync(() => {
    activatedRoute.queryParams.next({ filter: 'xxx' });
    fixture.detectChanges();

    const taskList: HTMLHeadElement|null = debugElement.querySelector('mat-nav-list');
    expect(taskList).toBeNull();

    const noTaksHtmlContent: HTMLHeadElement|null = debugElement.querySelector('div.no-tasks-container');

    // avoiding TS2531: Object is possibly 'null'
    if (noTaksHtmlContent) {
      expect(noTaksHtmlContent.textContent).toMatch('No matches for "xxx"');
    }
    else {
      throw new Error('Element "div.no-tasks-container" is not present in the DOM.');
    }

    // TODO(wassim): checking the data model always returns the whole collection!
    // component.filteredTaskCollections$.subscribe(result => {
    //   expect(result.taskCollections.length).toBe(0);
    // });
  }));


  it('should not update the taskFilterFormControl value when query param is not "filter"', async(() => {
    activatedRoute.queryParams.next({ otherfilter: 'othervalue' });
    fixture.detectChanges();

    component.filteredTaskCollections$.subscribe(_ => {
      expect(component.taskFilterFormControl.value).toBeNull();
    });
  }));

  it('should show all collections when query param is not "filter"', async(() => {
    activatedRoute.queryParams.next({ otherfilter: 'othervalue' });
    fixture.detectChanges();

    component.filteredTaskCollections$.subscribe(result => {
      expect(result.taskCollections.length).toBe(2);
      expect(result.taskCollections[0].tasks.length).toBe(14);
      expect(result.taskCollections[1].tasks.length).toBe(1);
      console.log(result.taskCollections)
    });
  }));

});
