import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, catchError, defer, finalize, tap } from 'rxjs';
import { CatalogsApi } from '../../core/api/catalogs.api';
import { SpecialtiesStore } from '../../core/catalogs/specialties.store';
import { apiErrorMessage } from '../../core/http/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { Specialty } from '../../core/models/api.models';
import { NotificationService } from '../../shared/services/notification.service';

@Injectable()
export class SpecialtiesService {
  private readonly api = inject(CatalogsApi);
  private readonly store = inject(SpecialtiesStore);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);

  readonly specialties = this.store.specialties;
  readonly isLoading = this.store.isLoading;
  readonly errorMessage = this.store.errorMessage;
  private readonly _saving = signal(false);
  readonly saving = this._saving.asReadonly();

  constructor() {
    this.store.load();
  }

  reload(): void {
    this.store.reload();
  }

  create(name: string): Observable<Specialty> {
    return defer(() => {
      this._saving.set(true);
      return this.api.createSpecialty({ name });
    }).pipe(
      tap((specialty) => {
        this.store.upsert(specialty);
        const prefix = this.i18n.translate('specialties.notifications.createdPrefix');
        const suffix = this.i18n.translate('specialties.notifications.createdSuffix');
        this.notifications.success(`${prefix} "${name}" ${suffix}`);
      }),
      catchError((error) => {
        this.notifications.error(
          apiErrorMessage(error, this.i18n, this.i18n.translate('specialties.errors.create')),
        );
        return EMPTY;
      }),
      finalize(() => this._saving.set(false)),
    );
  }
}
