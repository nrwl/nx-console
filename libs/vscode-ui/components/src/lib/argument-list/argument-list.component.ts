import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'nx-console-argument-list',
  templateUrl: './argument-list.component.html',
  styleUrls: ['./argument-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArgumentListComponent {
  @Input() args: string[];
}
