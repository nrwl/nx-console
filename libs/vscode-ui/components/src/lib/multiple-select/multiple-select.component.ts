import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ControlContainer, FormControl, FormGroup } from '@angular/forms';
import { ItemsWithEnum, Option } from '@nx-console/schema';
import { Subscription } from 'rxjs';

@Component({
  selector: 'nx-console-multiple-select',
  templateUrl: './multiple-select.component.html',
  styleUrls: ['./multiple-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultipleSelectComponent implements OnInit, OnDestroy {
  @Input() field: Option;
  @Input() value: string[];
  @Output() readonly valueChange = new EventEmitter<string[]>();
  selectControl: FormControl;
  items: string[];
  parentFormGroup: FormGroup;

  constructor(private readonly controlContainer: ControlContainer) {}

  private readonly subscriptions = new Subscription();

  ngOnInit(): void {
    this.parentFormGroup = this.controlContainer.control as FormGroup;
    this.selectControl = this.parentFormGroup.get(
      this.field.name
    ) as FormControl;
    this.subscriptions.add(
      this.selectControl.valueChanges.subscribe((value) =>
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
    return (items as ItemsWithEnum).enum !== undefined;
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
    this.subscriptions.unsubscribe();
  }
}
