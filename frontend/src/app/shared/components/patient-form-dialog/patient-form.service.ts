import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { PatientsApi } from '../../../core/api/patients.api';
import { StaffApi } from '../../../core/api/staff.api';
import { AuthService } from '../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../core/http/api-error';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Patient, PatientRequest } from '../../../core/models/api.models';
import { PATIENT_ASSIGNMENT_ENABLED } from '../../../core/utils/feature-flags.util';
import { NotificationService } from '../../services/notification.service';

@Injectable({ providedIn: 'root' })
export class PatientFormService {
  private readonly patientsApi = inject(PatientsApi);
  private readonly staffApi = inject(StaffApi);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  save(patient: Patient | undefined, request: PatientRequest): Observable<Patient> {
    const save$ = patient
      ? this.patientsApi.update(patient.id, request)
      : this.patientsApi.create(request);
    return save$.pipe(
      switchMap((saved) =>
        !patient && PATIENT_ASSIGNMENT_ENABLED && this.auth.restrictedToOwnData()
          ? this.staffApi
              .assignPatient({ patientId: saved.id, doctorId: this.auth.userId()! })
              .pipe(
                map(() => saved),
                catchError((error) => {
                  this.notifications.error(
                    `${this.i18n.translate('patients.formDialog.assignWarningPrefix')} ${apiErrorMessage(error, this.i18n)}`,
                  );
                  return of(saved);
                }),
              )
          : of(saved),
      ),
      tap(() =>
        this.notifications.success(
          this.i18n.translate(
            patient ? 'patients.formDialog.updatedSuccess' : 'patients.formDialog.createdSuccess',
          ),
        ),
      ),
    );
  }
}
