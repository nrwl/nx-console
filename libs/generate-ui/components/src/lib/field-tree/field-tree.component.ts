import {
  Component,
  ElementRef,
  Input,
  SimpleChanges,
  OnChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Option } from '@nx-console/shared/schema';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'generate-ui-field-tree',
  templateUrl: './field-tree.component.html',
  styleUrls: ['./field-tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldTreeComponent implements OnChanges {
  @Input() fields: Option[];
  @Input() activeFieldName: string;
  @Input() filteredFields: Set<string>;
  @Input() importantFields: Set<string>;
  @Input() showOtherFields = false;
  @Input() validFields: {
    [name: string]: string[] | string | number | boolean;
  };
  @Input() invalidFields: {
    [name: string]: string[] | string | number | boolean;
  };

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
          inline: 'nearest',
        });
      }
    }

    if (simpleChanges.fieldBins) {
      this.elementRef.nativeElement.scrollTo({
        top: 0,
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
    const element = document.getElementById(fieldName + '-nx-console-field');

    if (element) {
      element.scrollIntoView({
        block: 'start',
        inline: 'start',
      });
    }
  }

  getFieldsToDisplay() {
    if (this.showOtherFields) {
      return this.fields;
    }
    return this.fields.filter((f) => this.importantFields.has(f.name));
  }

  isFieldValid(fieldName: string): boolean {
    return this.validFields && !!this.validFields[fieldName];
  }

  isFieldInvalid(fieldName: string): boolean {
    return this.invalidFields && this.invalidFields[fieldName] !== undefined;
  }
}
