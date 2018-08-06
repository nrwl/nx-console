import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'normalizePath'
})
export class NormalizePathPipe implements PipeTransform {
  transform(value: string, args?: any): any {
    const firstPart = value.split('/')[0];
    if (!firstPart) return value;
    if (!firstPart.endsWith(':')) return value;
    return value
      .replace(new RegExp('/', 'g'), '\\')
      .split('\\')
      .filter(r => !!r)
      .join('\\');
  }
}
