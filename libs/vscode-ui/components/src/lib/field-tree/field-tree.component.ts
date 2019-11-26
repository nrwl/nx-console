import {
  Component,
  ElementRef,
  Input,
  SimpleChanges,
  OnChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import { Option } from '@angular-console/schema';

@Component({
  selector: 'vscode-ui-field-tree',
  templateUrl: './field-tree.component.html',
  styleUrls: ['./field-tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldTreeComponent implements OnChanges {
  @Input() fields: Array<Option>;
  @Input() activeFieldName: string;
  @Input() filteredFields: Set<string>;

  userSelectedField?: string;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngOnChanges(simpleChanges: SimpleChanges) {
    if (simpleChanges.activeFieldName) {
      if (this.userSelectedField) {
        this.activeFieldName = this.userSelectedField;
        this.userSelectedField = undefined;
      }
      const item = document.getElementById(
        this.activeFieldName + '-field-tree-item'
      );

      const parentTop = Number(this.elementRef.nativeElement.scrollTop);
      const parentBottom =
        parentTop + Number(this.elementRef.nativeElement.clientHeight);

      if (
        item &&
        (item.offsetTop < parentTop ||
          item.offsetTop + item.offsetHeight > parentBottom)
      ) {
        item.scrollIntoView({
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }

    if (simpleChanges.fieldBins) {
      this.elementRef.nativeElement.scrollTo({
        top: 0
      });
    }
  }

  camelToTitle(camelCase: string) {
    const result = camelCase.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  scrollToField(fieldName: string) {
    this.activeFieldName = fieldName;
    this.userSelectedField = fieldName;
    const element = document.getElementById(
      fieldName + '-angular-console-field'
    );
    if (element) {
      element.scrollIntoView({
        block: 'start',
        inline: 'start'
      });
    }
  }
}
