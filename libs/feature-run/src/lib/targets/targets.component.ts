import { Component, OnInit, ViewChild } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { Apollo } from 'apollo-angular';
import { filter, map, startWith, switchMap, tap } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import gql from 'graphql-tag';
import { Builder, Project } from '@nxui/utils';
import { FormControl } from '@angular/forms';
import { MatSelectionList } from '@angular/material';

@Component({
  selector: 'nxui-targets',
  templateUrl: './targets.component.html',
  styleUrls: ['./targets.component.scss']
})
export class TargetsComponent implements OnInit {
  @ViewChild(MatSelectionList) targetSelectionList: MatSelectionList;
  public projects$: Observable<Project>;
  targetFilterFormControl = new FormControl();

  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  navigateToSelectedTarget(s: { selected: boolean; value: any }) {
    if (s.selected) {
      this.router.navigate(
        [encodeURIComponent(s.value.name), encodeURIComponent(s.value.project)],
        { relativeTo: this.route }
      );
    } else {
      this.router.navigate(['.'], { relativeTo: this.route });
    }
  }

  ngOnInit() {
    (this.targetSelectionList.selectedOptions as any)._multiple = false;

    this.projects$ = combineLatest(
      this.targetFilterFormControl.valueChanges.pipe(startWith('')),
      this.route.params.pipe(
        map(m => m['path']),
        switchMap(path => {
          return this.apollo.watchQuery({
            pollInterval: 5000,
            query: gql`
              query($path: String!) {
                workspace(path: $path) {
                  projects {
                    name
                    root
                    projectType
                    architect {
                      name
                      project
                    }
                  }
                }
              }
            `,
            variables: {
              path
            }
          }).valueChanges;
        })
      )
    ).pipe(
      map(([targetFilterValue, r]: [string, any]) => {
        const f = targetFilterValue.toLowerCase();
        const projects = r.data.workspace.projects;
        return projects
          .map(c => {
            if (c.name.includes(targetFilterValue)) return c;
            const s = c.architect
              .filter(({ name }) => name.includes(targetFilterValue))
              .sort((a, b) => a.name.localeCompare(b.name));
            return { ...c, architect: s };
          })
          .filter(p => p.architect.length > 0);
      })
    );
  }

  trackByName(index: number, project: Project) {
    return project.name;
  }

  isSelected(project: string, target: string): boolean {
    return (
      this.router.url.indexOf(
        `${encodeURIComponent(encodeURIComponent(target))}/${encodeURIComponent(
          encodeURIComponent(project)
        )}`
      ) > -1
    );
  }
}
