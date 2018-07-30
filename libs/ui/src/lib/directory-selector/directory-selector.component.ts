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
import { Finder } from '@angular-console/utils';

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
  readonly treeControl: FlatTreeControl<DynamicFlatNode> = new FlatTreeControl(
    node => node.level,
    node => this.hasChild(0, node)
  );
  readonly dataSource = new DirectoryDataSource(this.treeControl, this.finder);
  afterViewInit = false;

  @Output() readonly toggleNodeSelection = new EventEmitter<DynamicFlatNode>();

  @Input() selectedNode: DynamicFlatNode | null;
  @Input()
  readonly disableNode: (node: DynamicFlatNode) => boolean = () => false;

  @Input() readonly handleNodeCreation: (node: DynamicFlatNode) => void;

  constructor(private readonly finder: Finder) {}

  ngAfterViewInit() {
    this.afterViewInit = true;
  }

  hasChild(_: number, node: DynamicFlatNode): boolean {
    return node.file.type === 'directory';
  }

  onTreeNodeMouseenter(event: Event) {
    if (!this.handleNodeCreation || !event.target) {
      return;
    }
    const btn = (event.target as HTMLElement).querySelector(
      '.node-creation-button'
    );
    if (!btn) {
      return;
    }
    btn.classList.remove('hidden');
  }

  onTreeNodeMouseleave(event: Event) {
    if (!this.handleNodeCreation || !event.target) {
      return;
    }
    const btn = (event.target as HTMLElement).querySelector(
      '.node-creation-button'
    );
    if (!btn) {
      return;
    }
    btn.classList.add('hidden');
  }
}
