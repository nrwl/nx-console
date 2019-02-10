import { Extension } from '@angular-console/schema';
import {
  TaskRunnerComponent,
  CommandOutputComponent
} from '@angular-console/ui';
import {
  IncrementalCommandOutput,
  CommandRunner
} from '@angular-console/utils';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import {
  NgAddGQL,
  WorkspaceAndExtensionsByNameGQL
} from '../generated/graphql';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-extension',
  templateUrl: './extension.component.html',
  styleUrls: ['./extension.component.scss']
})
export class ExtensionComponent implements OnInit {
  extension$: Observable<Extension>;
  command$: Observable<string>;
  commandOutput$: Observable<IncrementalCommandOutput>;
  @ViewChild(CommandOutputComponent) out: CommandOutputComponent;
  @ViewChild(TaskRunnerComponent) taskRunner: TaskRunnerComponent;

  private readonly ngAdd$ = new Subject<any>();
  private readonly ngAddDisabled$ = new BehaviorSubject(true);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly runner: CommandRunner,
    private readonly contextActionService: ContextualActionBarService,
    private readonly ngAddGQL: NgAddGQL,
    private readonly workspaceAndExtensionsByNameGQL: WorkspaceAndExtensionsByNameGQL
  ) {}

  ngOnInit() {
    const extensionDescription$ = this.route.params.pipe(
      map(p => {
        if (!p.name) return null;
        return {
          name: decodeURIComponent(p.name),
          path: p.path
        };
      })
    );

    this.extension$ = extensionDescription$.pipe(
      switchMap(p => {
        if (!p) {
          return of();
        }
        if (this.out) {
          this.out.reset();
        }

        return this.workspaceAndExtensionsByNameGQL.fetch(p);
      }),
      map((r: any) => {
        const extension: Extension = r.data.availableExtensions[0];
        const installed: Array<Extension> = r.data.workspace.extensions;
        const i = installed.filter(ii => ii.name === extension.name).length > 0;
        return {
          ...extension,
          description: extension.detailedDescription
            ? extension.detailedDescription
            : extension.description,
          installed: i
        };
      }),
      tap((extension: Extension) => {
        const contextTitle = this.getContextTitle(extension);
        this.ngAddDisabled$.next(Boolean(extension.installed));
        this.contextActionService.contextualActions$.next({
          contextTitle,
          actions: [
            {
              invoke: this.ngAdd$,
              disabled: this.ngAddDisabled$,
              name: extension.installed ? 'Already Installed' : 'Add'
            }
          ]
        });
      }),
      publishReplay(1),
      refCount()
    );

    this.commandOutput$ = this.ngAdd$.pipe(
      withLatestFrom(this.extension$),
      tap(() => {
        this.taskRunner.terminalVisible$.next(true);
      }),
      switchMap(([_, a]) => {
        this.out.reset();
        return this.runner.runCommand(
          this.ngAddGQL.mutate({
            path: this.path(),
            name: a.name
          }),
          false,
          this.out.terminal.currentCols
        );
      }),
      publishReplay(1),
      refCount()
    );

    this.command$ = this.extension$.pipe(map(a => `ng add ${a.name}`));
  }

  getContextTitle(extension: Extension) {
    return `${extension.name} extension`;
  }

  path() {
    return this.route.snapshot.params.path;
  }

  onRun() {
    this.ngAdd$.next();
  }
}
