import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RegionCatalog } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class RegionsApi {
  private readonly http = inject(HttpClient);

  catalog(): Observable<RegionCatalog> {
    return this.http.get<RegionCatalog>('regions');
  }
}
