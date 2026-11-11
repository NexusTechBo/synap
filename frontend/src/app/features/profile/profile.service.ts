import { Dialog } from '@angular/cdk/dialog';
import { Injectable, computed, inject } from '@angular/core';
import { EMPTY, Observable, catchError, filter, map, switchMap, tap, throwError } from 'rxjs';
import { StaffApi } from '../../core/api/staff.api';
import { AuthService } from '../../core/auth/auth.service';
import { ROLES } from '../../core/auth/roles';
import { DoctorsStore } from '../../core/catalogs/doctors.store';
import { SpecialtiesStore } from '../../core/catalogs/specialties.store';
import {
  apiErrorMessage,
  doctorModeAppointmentsConflict,
  resourceError,
} from '../../core/http/api-error';
import { DoctorModeRequest, ProfileUpdateRequest, Staff } from '../../core/models/api.models';
import { ConfirmService } from '../../shared/services/confirm.service';
import { NotificationService } from '../../shared/services/notification.service';
import { labelledByFrame } from '../../shared/ui/dialog-frame/dialog-frame.component';
import {
  DoctorModeAppointmentsData,
  DoctorModeAppointmentsDialogComponent,
  DoctorModeAppointmentsResult,
} from './components/doctor-mode-appointments-dialog/doctor-mode-appointments-dialog.component';

function disabledMessage(cancelled: number): string {
  if (cancelled === 0) return 'Ya no atiendes como doctor';
  return cancelled === 1
    ? 'Ya no atiendes como doctor. Se canceló la cita y se notificó al paciente'
    : 'Ya no atiendes como doctor. Se cancelaron las citas y se notificó a los pacientes';
}

@Injectable()
export class ProfileService {
  private readonly staffApi = inject(StaffApi);
  private readonly specialtiesStore = inject(SpecialtiesStore);
  private readonly doctorsStore = inject(DoctorsStore);
  private readonly dialog = inject(Dialog);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);

  readonly me = this.auth.profile;
  readonly isLoading = this.auth.profileLoading;
  readonly specialties = this.specialtiesStore.specialties;
  readonly specialtiesLoading = this.specialtiesStore.isLoading;
  readonly specialtiesErrorMessage = this.specialtiesStore.errorMessage;

  readonly errorMessage = resourceError(
    { error: this.auth.profileError },
    'No se pudo cargar tu perfil',
  );
  readonly canToggleDoctorMode = computed(() => this.auth.hasRole(...ROLES.admin));
  readonly doctorMode = computed(() => this.auth.hasRole('DOCTOR'));

  constructor() {
    if (this.canToggleDoctorMode()) this.specialtiesStore.load();
  }

  reload(): void {
    this.auth.reloadProfile();
  }

  reloadSpecialties(): void {
    this.specialtiesStore.reload();
  }

  update(request: ProfileUpdateRequest): Observable<Staff> {
    return this.staffApi.updateSelf(request).pipe(
      tap((profile) => {
        this.notifications.success('Perfil actualizado');
        this.auth.setProfile(profile);
        if (this.doctorMode()) this.doctorsStore.invalidate();
      }),
    );
  }

  enableDoctorMode(specialtyId: number): Observable<unknown> {
    return this.changeDoctorMode({ enabled: true, specialtyId }).pipe(
      tap(() => this.notifications.success('Ahora también atiendes como doctor')),
    );
  }

  disableDoctorMode(): Observable<unknown> {
    return this.confirm
      .ask({
        title: 'Dejar de atender como doctor',
        message:
          'Ya no aparecerás como doctor para nuevas citas. Tus horarios de atención se conservan y volverán a estar disponibles si reactivas el modo doctor.',
        confirmLabel: 'Dejar de atender',
        danger: true,
      })
      .pipe(
        filter(Boolean),
        switchMap(() => this.disableCountingCancelled()),
        tap((cancelled) => this.notifications.success(disabledMessage(cancelled))),
        catchError((error) => {
          this.notifications.error(apiErrorMessage(error, 'No se pudo desactivar el modo doctor'));
          return EMPTY;
        }),
      );
  }

  /** Emits how many appointments were cancelled (0 when none). */
  private disableCountingCancelled(): Observable<number> {
    return this.changeDoctorMode({ enabled: false, specialtyId: null }).pipe(
      map(() => 0),
      catchError((error) => {
        const count = doctorModeAppointmentsConflict(error);
        return count === null ? throwError(() => error) : this.disableCancellingAppointments(count);
      }),
    );
  }

  private disableCancellingAppointments(count: number): Observable<number> {
    return this.dialog
      .open<DoctorModeAppointmentsResult, DoctorModeAppointmentsData>(
        DoctorModeAppointmentsDialogComponent,
        { ...labelledByFrame(), data: { count } },
      )
      .closed.pipe(
        filter((result): result is DoctorModeAppointmentsResult => !!result),
        switchMap(({ reason }) =>
          this.changeDoctorMode({
            enabled: false,
            specialtyId: null,
            cancelAppointments: true,
            ...(reason ? { cancellationReason: reason } : {}),
          }),
        ),
        map(() => count),
      );
  }

  private changeDoctorMode(request: DoctorModeRequest): Observable<unknown> {
    return this.staffApi.updateDoctorMode(request).pipe(
      tap(({ token }) => {
        this.auth.replaceToken(token);
        this.auth.reloadProfile();
        this.doctorsStore.invalidate();
      }),
    );
  }
}
