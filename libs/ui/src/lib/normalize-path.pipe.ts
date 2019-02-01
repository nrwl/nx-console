import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'normalizePath'
})
export class NormalizePathPipe implements PipeTransform {
  transform(value: string, _?: any): any {
    const firstPartIfWin = value.split('\\')[0];
    if (firstPartIfWin && firstPartIfWin.endsWith(':')) {
      return this.toWin(value);
    }

    const firstPartIfUnix = value.split('/')[0];
    if (firstPartIfUnix && firstPartIfUnix.endsWith(':')) {
      return this.toWin(value);
    }

    return value;
  }

  private toWin(value: string) {
    return value
      .replace(new RegExp('/', 'g'), '\\')
      .split('\\')
      .filter(r => !!r)
      .join('\\');
  }
}
