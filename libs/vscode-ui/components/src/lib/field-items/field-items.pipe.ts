import { Pipe, PipeTransform } from '@angular/core';
import { ItemsWithEnum, Option } from '@nx-console/schema';

export const getOptionItems = (field: Option): string[] | undefined => {
  return (
    field.items &&
    (((field.items as ItemsWithEnum)?.enum as string[]) ||
      (field.items as string[]))
  );
};

@Pipe({
  name: 'fieldItems',
})
export class FieldItemsPipe implements PipeTransform {
  transform(field: Option): string[] | undefined {
    return getOptionItems(field);
  }
}
