import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
  OnDestroy
} from '@angular/core';
import { ControlContainer, FormControl, FormGroup } from '@angular/forms';
import { ItemsWithEnum, Option } from '@nx-console/schema';
import { Subscription } from 'rxjs';

@Component({
  selector: 'nx-console-multiple-select',
  templateUrl: './multiple-select.component.html',
  styleUrls: ['./multiple-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultipleSelectComponent implements OnInit, OnChanges, OnDestroy {
  @Input() field: Option;
  @Input() value: string[];
  @Output() readonly valueChange = new EventEmitter<string[]>();
  selectControl = new FormControl([]);
  items: string[];
  parentFormGroup: FormGroup;

  constructor(private controlContainer: ControlContainer) {
    this.parentFormGroup = this.controlContainer.control as FormGroup;
  }

  private readonly subscriptioins = new Subscription();

  ngOnInit(): void {
    this.subscriptioins.add(
      this.selectControl.valueChanges.subscribe(value =>
        this.valueChange.emit(value)
      )
    );
    if (this.field.items) {
      this.items = this.isItemsWithEnum(this.field.items)
        ? this.field.items.enum
        : this.field.items;
    }
  }

  private isItemsWithEnum(
    items: string[] | ItemsWithEnum
  ): items is ItemsWithEnum {
    // tslint:disable-next-line: strict-type-predicates
    return (items as ItemsWithEnum).enum !== undefined;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.value) {
      this.selectControl.setValue(changes.value.currentValue);
    }
  }

  getOptionTooltip(optionValue: string): string | null {
    if (
      this.field &&
      this.field.itemTooltips &&
      this.field.itemTooltips[optionValue]
    ) {
      return this.field.itemTooltips[optionValue];
    }
    return null;
  }

  ngOnDestroy(): void {
    this.subscriptioins.unsubscribe();
  }
}
