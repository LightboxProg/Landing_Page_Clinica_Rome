import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'relativeTime',
  standalone: true
})
export class RelativeTimePipe implements PipeTransform {

  transform(value: any): string {
    if (!value) return '';

    const date = new Date(value);
    const now = new Date();
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);

    const absDiff = Math.abs(diffInSeconds);
    const suffix = diffInSeconds < 0 ? 'hace ' : 'en ';
    const prefix = diffInSeconds < 0 ? '' : ''; 

    if (absDiff < 60) {
      return diffInSeconds < 0 ? 'hace un momento' : 'ahora mismo';
    }

    const minutes = Math.floor(absDiff / 60);
    if (minutes < 60) {
      return diffInSeconds < 0 ? `hace ${minutes} min` : `en ${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return diffInSeconds < 0 ? `hace ${hours} h` : `en ${hours} h`;
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
      return diffInSeconds < 0 ? `hace ${days} d` : `en ${days} d`;
    }

    return date.toLocaleDateString();
  }
}
