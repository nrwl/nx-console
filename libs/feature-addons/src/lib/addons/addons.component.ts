import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import gql from 'graphql-tag';
import { map, switchMap } from 'rxjs/operators';
import { Apollo } from 'apollo-angular';
import {
  BehaviorSubject,
  interval,
  Observable,
  Subscription,
  combineLatest,
  Subject
} from 'rxjs';
import { CommandRunner, Messenger } from '@nxui/utils';
import { CommandOutput } from '@nxui/utils';

interface Addon {
  name: string;
  version: string;
}

@Component({
  selector: 'nxui-addons',
  templateUrl: './addons.component.html',
  styleUrls: ['./addons.component.css']
})
export class AddonsComponent implements OnInit {
  addons$: Observable<any>;
  commandOutput$: Observable<CommandOutput>;
  private ngAdd$ = new Subject<Addon>();

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
                  version
                }
              }
              availableAddons {
                name
                description
                version
              }
            }
          `,
          variables: {
            path
          }
        }).valueChanges;
      }),
      map((r: any) => r.data)
    );

    this.commandOutput$ = this.ngAdd$.pipe(
      switchMap(addon => {
        return this.commandRunner.runCommand(
          gql`
            mutation($path: String!, $name: String!, $version: String!) {
              ngAdd(path: $path, name: $name, version: $version) {
                command
              }
            }
          `,
          {
            path: this.route.snapshot.params['path'],
            name: addon.name,
            version: addon.version
          },
          (res: any) => res.data.ngAdd.command,
          false
        );
      })
    );
  }

  ngAdd(addon: Addon) {
    this.ngAdd$.next(addon);
  }

  trackByName(index: number, addon: Addon) {
    return addon.name;
  }
}
