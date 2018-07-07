import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TerminalComponent } from '@nxui/ui';
import { CommandOutput, CommandRunner } from '@nxui/utils';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { Observable, Subject } from 'rxjs';
import { map, publishReplay, refCount, switchMap } from 'rxjs/operators';

interface Addon {
  name: string;
  description: string;
}

@Component({
  selector: 'nxui-addons',
  templateUrl: './addons.component.html',
  styleUrls: ['./addons.component.css']
})
export class AddonsComponent implements OnInit {
  addons$: Observable<any>;
  commandOutput$: Observable<CommandOutput>;
  command$ = new Subject();
  private ngAdd$ = new Subject<Addon>();
  @ViewChild('out', { read: TerminalComponent })
  out: TerminalComponent;

  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute,
    private commandRunner: CommandRunner
  ) {}

  ngOnInit() {
    this.addons$ = this.route.params.pipe(
      map(m => m['path']),
      switchMap(path => {
        return this.apollo.watchQuery({
          pollInterval: 2000,
          query: gql`
            query($path: String!) {
              workspace(path: $path) {
                addons {
                  name
                  description
                }
              }
              availableAddons {
                name
                description
              }
            }
          `,
          variables: {
            path
          }
        }).valueChanges;
      }),
      map((r: any) => {
        const d = r.data;
        const availableAddons = d.availableAddons.filter((aa: any) => {
          return !d.workspace.addons.find((a: any) => aa.name === a.name);
        });
        return { ...d, availableAddons };
      }),
      publishReplay(1),
      refCount()
    );

    this.commandOutput$ = this.ngAdd$.pipe(
      switchMap(addon => {
        this.out.clear();
        return this.commandRunner.runCommand(
          gql`
            mutation($path: String!, $name: String!) {
              ngAdd(path: $path, name: $name) {
                command
              }
            }
          `,
          {
            path: this.route.snapshot.params['path'],
            name: addon.name
          },
          (res: any) => res.data.ngAdd.command,
          false
        );
      }),
      publishReplay(1),
      refCount()
    );
  }

  ngAdd(addon: Addon) {
    this.command$.next(`ng add ${addon.name}`);
    this.ngAdd$.next(addon);
  }

  trackByName(_: number, addon: Addon) {
    return addon.name;
  }
}
