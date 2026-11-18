import { Pipe, PipeTransform } from '@angular/core';
import { CountryCode } from '../../core/models/api.models';
import { formatDocument } from '../utils/document.util';

@Pipe({
  name: 'documentFormat',
  standalone: true,
})
export class DocumentFormatPipe implements PipeTransform {
  transform(value: string | null | undefined, country: CountryCode): string {
    return formatDocument(value, country);
  }
}
