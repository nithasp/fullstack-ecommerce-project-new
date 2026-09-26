import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'humanize',
})
export class HumanizePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const words = value.replace(/[._]+/g, ' ').trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
}
