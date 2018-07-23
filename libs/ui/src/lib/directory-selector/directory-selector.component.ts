import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import { FlatTreeControl } from '@angular/cdk/tree';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { Finder } from '@nxui/utils';

import { DirectoryDataSource, DynamicFlatNode } from './directory-data-source';

@Component({
  selector: 'ui-directory-selector',
  templateUrl: './directory-selector.component.html',
  styleUrls: ['./directory-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('growIn', [
      state('void', style({ height: 0 })),
      state('*', style({ height: '36px' })),
      transition(`:enter`, animate(`200ms ease-in-out`)),
      transition(`:leave`, animate(`200ms ease-in-out`))
    ])
  ]
})
export class DirectorySelectorComponent implements AfterViewInit {
  @Output() readonly toggleNodeSelection = new EventEmitter<DynamicFlatNode>();

  @Input() readonly disableNode: (node: DynamicFlatNode) => boolean;

  readonly treeControl: FlatTreeControl<DynamicFlatNode> = new FlatTreeControl(
    node => node.level,
    node => this.hasChild(0, node)
  );

  readonly dataSource = new DirectoryDataSource(this.treeControl, this.finder);

  @Input() selectedNode: DynamicFlatNode | null;

  constructor(private readonly finder: Finder) {}

  afterViewInit = false;

  ngAfterViewInit() {
    this.afterViewInit = true;
  }

  hasChild(_: number, node: DynamicFlatNode): boolean {
    return node.hasChildren;
  }
}
