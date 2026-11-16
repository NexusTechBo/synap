import { Dialog } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, filter, map, switchMap, tap } from 'rxjs';
import { AppointmentsApi } from '../../core/api/appointments.api';
import { apiErrorMessage } from '../../core/http/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppointmentResponse } from '../../core/models/api.models';
import { datePart, formatDayLabel, formatTime } from '../../core/utils/calendar.util';
import {
  AppointmentDetailData,
  AppointmentDetailDialogComponent,
} from '../components/appointment-detail-dialog/appointment-detail-dialog.component';
import {
  CancelAppointmentData,
  CancelAppointmentDialogComponent,
  CancelAppointmentResult,
} from '../components/cancel-appointment-dialog/cancel-appointment-dialog.component';
import { labelledByFrame } from '../ui/dialog-frame/dialog-frame.component';
import { ConfirmService } from './confirm.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class AppointmentActionsService {
  private readonly api = inject(AppointmentsApi);
  private readonly confirmService = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(Dialog);
  private readonly i18n = inject(I18nService);

  private dayTime(startTime: string): string {
    const locale = this.i18n.currentLang() === 'en' ? 'en-US' : 'es-ES';
    return `${formatDayLabel(datePart(startTime), locale).toLowerCase()} ${formatTime(startTime)}`;
  }

  confirm(id: number, patientName: string, startTime: string): Observable<AppointmentResponse> {
    return this.confirmService
      .ask({
        title: this.i18n.translate('shared.appointmentActions.confirmTitle'),
        message: `${this.i18n.translate('shared.appointmentActions.confirmMessagePrefix')} ${patientName} ${this.i18n.translate('shared.appointmentActions.confirmMessageConnector')} ${this.dayTime(startTime)}?`,
        confirmLabel: this.i18n.translate('shared.appointmentActions.confirmLabel'),
      })
      .pipe(
        filter(Boolean),
        switchMap(() =>
          this.run(
            this.api.confirm(id),
            this.i18n.translate('shared.appointmentActions.confirmedSuccess'),
          ),
        ),
      );
  }

  cancel(id: number, patientName: string, startTime: string): Observable<AppointmentResponse> {
    return this.dialog
      .open<CancelAppointmentResult, CancelAppointmentData>(CancelAppointmentDialogComponent, {
        ...labelledByFrame(),
        data: { patientName, when: this.dayTime(startTime) },
      })
      .closed.pipe(
        filter((result): result is CancelAppointmentResult => !!result),
        switchMap(({ reason }) =>
          this.run(
            this.api.cancel(id, { reason }),
            this.i18n.translate('shared.appointmentActions.cancelledSuccess'),
          ),
        ),
      );
  }

  openDetail(id: number): Observable<void> {
    return this.dialog
      .open<boolean, AppointmentDetailData>(AppointmentDetailDialogComponent, {
        ...labelledByFrame(),
        data: { id },
        autoFocus: 'first-heading',
        disableClose: true,
      })
      .closed.pipe(
        filter((changed) => changed === true),
        map(() => undefined),
      );
  }

  private run(
    request: Observable<AppointmentResponse>,
    successMessage: string,
  ): Observable<AppointmentResponse> {
    return request.pipe(
      tap(() => this.notifications.success(successMessage)),
      catchError((error) => {
        this.notifications.error(apiErrorMessage(error));
        return EMPTY;
      }),
    );
  }
}
