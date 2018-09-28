import { Extension } from '@angular-console/schema';
import { TaskRunnerComponent, TerminalComponent } from '@angular-console/ui';
import { CommandOutput, CommandRunner } from '@angular-console/utils';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { map, publishReplay, refCount, switchMap, tap, withLatestFrom } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'angular-console-extension',
  templateUrl: './extension.component.html',
  styleUrls: ['./extension.component.scss']
})
export class ExtensionComponent implements OnInit {
  extension$: Observable<Extension>;
  command$: Observable<string>;
  commandOutput$: Observable<CommandOutput>;
  @ViewChild(TerminalComponent) out: TerminalComponent;
  @ViewChild(TaskRunnerComponent) taskRunner: TaskRunnerComponent;

  private readonly ngAdd$ = new Subject<any>();
  private readonly ngAddDisabled$ = new BehaviorSubject(true);

  constructor(
    private readonly apollo: Apollo,
    private readonly route: ActivatedRoute,
    private readonly runner: CommandRunner,
    private readonly contextActionService: ContextualActionBarService
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
        return this.apollo.query({
          query: gql`
            query($path: String!, $name: String!) {
              workspace(path: $path) {
                extensions {
                  name
                }
              }
              availableExtensions(name: $name) {
                name
                description
                detailedDescription
              }
            }
          `,
          variables: p
        });
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
        this.ngAddDisabled$.next(extension.installed);
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
        this.taskRunner.terminalVisible.next(true);
      }),
      switchMap(([_, a]) => {
        this.out.reset();
        return this.runner.runCommand(
          gql`
            mutation($path: String!, $name: String!) {
              ngAdd(path: $path, name: $name) {
                command
              }
            }
          `,
          {
            path: this.path(),
            name: a.name
          },
          false
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

  onStop() {
    this.runner.stopCommand();
  }
}
