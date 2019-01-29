import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatFileSize'
})
export class FormatFileSizePipe implements PipeTransform {
  transform(value: number | string, emptyString?: string): any {
    return formatFileSize(Number(value), emptyString);
  }
}

const UNITS = ['B', 'kB', 'MB'];

export function formatFileSize(x: number, emptyString?: string) {
  if (!Number.isFinite(x)) {
    return 'Infinity';
  } else if (x === 0) {
    return emptyString || '0.0B';
  } else {
    const exponent = Math.min(Math.floor(Math.log10(x) / 3), UNITS.length - 1);
    const y = (x / Math.pow(1000, exponent)).toFixed(1);
    return `${y}${UNITS[exponent]}`;
  }
}
