import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import gql from 'graphql-tag';
import { map, publishReplay, refCount, switchMap } from 'rxjs/operators';
import { Apollo } from 'apollo-angular';
import { Observable, Subject } from 'rxjs';
import { CommandOutput, CommandRunner, Messenger } from '@nxui/utils';
import { TerminalComponent } from '@nxui/ui';

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
    private commandRunner: CommandRunner,
    private messenger: Messenger
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
        const availableAddons = d.availableAddons.filter(aa => {
          return !d.workspace.addons.find(a => aa.name === a.name);
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

  trackByName(index: number, addon: Addon) {
    return addon.name;
  }
}
