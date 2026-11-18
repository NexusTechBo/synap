import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, catchError, debounceTime, distinctUntilChanged, map, tap } from 'rxjs';
import { PatientsApi } from '../../core/api/patients.api';
import { StaffApi } from '../../core/api/staff.api';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage, resourceError } from '../../core/http/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { Patient } from '../../core/models/api.models';
import { PATIENT_ASSIGNMENT_ENABLED } from '../../core/utils/feature-flags.util';
import { ConfirmService } from '../../shared/services/confirm.service';
import { NotificationService } from '../../shared/services/notification.service';
import { stripDocumentSeparators } from '../../shared/utils/document.util';
import { PatientRow, PatientScope } from './patients.model';

const PATIENTS_PAGE_SIZE = 12;

@Injectable()
export class PatientsService {
  private readonly patientsApi = inject(PatientsApi);
  private readonly staffApi = inject(StaffApi);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly userId = this.auth.userId()!;

  readonly ownListEnabled = PATIENT_ASSIGNMENT_ENABLED && this.auth.hasRole('DOCTOR');
  readonly canManageDoctors = PATIENT_ASSIGNMENT_ENABLED && !this.auth.restrictedToOwnData();

  private readonly _scope = signal<PatientScope>(
    PATIENT_ASSIGNMENT_ENABLED && this.auth.restrictedToOwnData() ? 'mine' : 'all',
  );
  private readonly _search = signal('');
  private readonly _showInactive = signal(false);
  private readonly page = signal(0);
  readonly scope = this._scope.asReadonly();
  readonly search = this._search.asReadonly();
  readonly showInactive = this._showInactive.asReadonly();
  private readonly debouncedSearch = toSignal(
    toObservable(this._search).pipe(
      debounceTime(500),
      map((search) => search.trim()),
      distinctUntilChanged(),
      tap(() => this.page.set(0)),
    ),
    { initialValue: '' },
  );

  private readonly allResource = rxResource({
    params: () =>
      this.scope() === 'all'
        ? {
            search: this.debouncedSearch(),
            isActive: this.showInactive() ? undefined : true,
            page: this.page(),
          }
        : undefined,
    stream: ({ params }) =>
      this.patientsApi.list({ ...params, size: PATIENTS_PAGE_SIZE, sort: 'id' }),
  });
  private readonly mineResource = rxResource({
    params: () => (this.ownListEnabled ? this.userId : undefined),
    stream: ({ params }) => this.staffApi.patientsOf(params),
  });

  private readonly mineFiltered = computed(() => {
    const showInactive = this.showInactive();
    const term = this.debouncedSearch().toLowerCase();
    const documentTerm = stripDocumentSeparators(term);
    return (this.mineResource.hasValue() ? this.mineResource.value() : [])
      .filter((patient) => showInactive || patient.active)
      .filter(
        (patient) =>
          !term ||
          `${patient.name} ${patient.document ?? ''} ${patient.email} ${patient.phoneNumber ?? ''}`
            .toLowerCase()
            .includes(term) ||
          (!!documentTerm && (patient.document ?? '').includes(documentTerm)),
      );
  });
  readonly patients = computed(() => {
    if (this.scope() === 'all')
      return this.allResource.hasValue() ? this.allResource.value().content : [];
    const start = this.page() * PATIENTS_PAGE_SIZE;
    return this.mineFiltered().slice(start, start + PATIENTS_PAGE_SIZE);
  });
  readonly pagination = computed(() => {
    if (this.scope() === 'all') {
      const page = this.allResource.hasValue() ? this.allResource.value().page : undefined;
      return {
        number: this.page(),
        totalElements: page?.totalElements ?? 0,
        totalPages: page?.totalPages ?? 0,
      };
    }
    return {
      number: this.page(),
      totalElements: this.mineFiltered().length,
      totalPages: Math.ceil(this.mineFiltered().length / PATIENTS_PAGE_SIZE),
    };
  });
  private readonly mineIds = computed(
    () =>
      new Set(
        (this.mineResource.hasValue() ? this.mineResource.value() : []).map(
          (patient) => patient.id,
        ),
      ),
  );
  readonly rows = computed<PatientRow[]>(() => {
    const mine = this.mineIds();
    return this.patients().map((patient) => ({ patient, mine: mine.has(patient.id) }));
  });
  private readonly activeResource = computed(() =>
    this.scope() === 'all' ? this.allResource : this.mineResource,
  );
  readonly isLoading = computed(() => this.activeResource().isLoading());
  readonly errorMessage = resourceError(
    { error: () => this.activeResource().error() },
    this.i18n,
    this.i18n.translate('patients.errors.load'),
  );

  reload(): void {
    this.allResource.reload();
    this.mineResource.reload();
  }

  reloadMine(): void {
    this.mineResource.reload();
  }

  setScope(scope: PatientScope): void {
    this._scope.set(scope);
    this.page.set(0);
  }

  setSearch(search: string): void {
    this._search.set(search);
  }

  setShowInactive(showInactive: boolean): void {
    this._showInactive.set(showInactive);
    this.page.set(0);
  }

  setPage(page: number): void {
    this.page.set(page);
  }

  deactivate(patient: Patient): Observable<unknown> {
    return this.confirm
      .confirmThen(
        {
          title: this.i18n.translate('patients.deactivateConfirm.title'),
          message: `${patient.name} ${this.i18n.translate('patients.deactivateConfirm.messageSuffix')}`,
          confirmLabel: this.i18n.translate('patients.deactivateConfirm.confirmLabel'),
          danger: true,
        },
        () => this.patientsApi.deactivate(patient.id),
        this.i18n.translate('patients.deactivateConfirm.success'),
        this.i18n.translate('patients.deactivateConfirm.error'),
      )
      .pipe(tap(() => this.reload()));
  }

  activate(patient: Patient): Observable<unknown> {
    return this.confirm
      .confirmThen(
        {
          title: this.i18n.translate('patients.reactivateConfirm.title'),
          message: `${this.i18n.translate('patients.reactivateConfirm.messagePrefix')} ${patient.name}?`,
          confirmLabel: this.i18n.translate('patients.reactivateConfirm.confirmLabel'),
        },
        () => this.patientsApi.activate(patient.id),
        this.i18n.translate('patients.reactivateConfirm.success'),
        this.i18n.translate('patients.reactivateConfirm.error'),
      )
      .pipe(tap(() => this.reload()));
  }

  toggleMine(patient: Patient): Observable<unknown> {
    const request = { patientId: patient.id, doctorId: this.userId };
    const mine = this.mineIds().has(patient.id);
    return (
      mine ? this.staffApi.removePatient(request) : this.staffApi.assignPatient(request)
    ).pipe(
      tap(() => {
        this.notifications.success(
          this.i18n.translate(
            mine
              ? 'patients.notifications.removedFromMine'
              : 'patients.notifications.assignedToMine',
          ),
        );
        this.reload();
      }),
      catchError((error) => {
        this.notifications.error(apiErrorMessage(error, this.i18n));
        return EMPTY;
      }),
    );
  }
}
