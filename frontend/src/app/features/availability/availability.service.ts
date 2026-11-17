import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Observable,
  catchError,
  concatMap,
  finalize,
  from,
  map,
  of,
  switchMap,
  tap,
  throwError,
  toArray,
} from 'rxjs';
import { AgendaApi } from '../../core/api/agenda.api';
import { AuthService } from '../../core/auth/auth.service';
import { ClinicClockService } from '../../core/clinic/clinic-clock.service';
import {
  activeAppointmentsConflict,
  apiErrorMessage,
  resourceError,
} from '../../core/http/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  Availability,
  AvailabilityRequest,
  DayOfWeek,
  ScheduleException,
  ScheduleExceptionRequest,
} from '../../core/models/api.models';
import { formatLongDate, formatTime } from '../../core/utils/calendar.util';
import { DAYS_OF_WEEK } from '../../core/utils/labels.util';
import { ConfirmService } from '../../shared/services/confirm.service';
import { NotificationService } from '../../shared/services/notification.service';

type AvailabilityBlock = Omit<AvailabilityRequest, 'dayOfWeek'>;

export interface AddAvailabilityResult {
  saved: DayOfWeek[];
  failed: { day: DayOfWeek; message: string }[];
}

@Injectable()
export class AvailabilityService {
  private readonly api = inject(AgendaApi);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly doctorId = inject(AuthService).userId()!;
  private readonly clock = inject(ClinicClockService);

  readonly today = this.clock.today();
  private readonly _previewDate = signal(this.today);
  readonly previewDate = this._previewDate.asReadonly();

  private readonly availabilityResource = rxResource({ stream: () => this.api.availabilities() });
  private readonly exceptionsResource = rxResource({
    stream: () => this.api.exceptions(this.today),
  });
  private readonly previewResource = rxResource({
    params: () => this.previewDate(),
    stream: ({ params }) =>
      this.api
        .availableSlots(this.doctorId, params)
        .pipe(map((response) => response.availableSlots.map((slot) => formatTime(slot.startTime)))),
  });
  readonly isWeekLoading = this.availabilityResource.isLoading;
  readonly isExceptionsLoading = this.exceptionsResource.isLoading;
  readonly isPreviewLoading = this.previewResource.isLoading;

  readonly week = computed(() => {
    this.i18n.currentLang();
    const blocks = this.availabilityResource.hasValue() ? this.availabilityResource.value() : [];
    return DAYS_OF_WEEK.map((day) => ({
      value: day.value,
      label: this.i18n.translate(`days.${day.value}.label`),
      short: this.i18n.translate(`days.${day.value}.short`),
      blocks: blocks
        .filter((block) => block.dayOfWeek === day.value)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
  });
  readonly exceptions = computed(() =>
    this.exceptionsResource.hasValue() ? this.exceptionsResource.value() : [],
  );
  readonly previewSlots = computed(() =>
    this.previewResource.hasValue() ? this.previewResource.value() : [],
  );
  readonly weekError = resourceError(
    this.availabilityResource,
    this.i18n.translate('availability.errors.loadWeek'),
  );
  readonly exceptionsError = resourceError(
    this.exceptionsResource,
    this.i18n.translate('availability.errors.loadExceptions'),
  );
  readonly previewError = resourceError(
    this.previewResource,
    this.i18n.translate('availability.errors.loadPreview'),
  );

  reload(): void {
    this.availabilityResource.reload();
    this.exceptionsResource.reload();
    this.previewResource.reload();
  }

  reloadPreview(): void {
    this.previewResource.reload();
  }

  setPreviewDate(iso: string): void {
    if (iso) this._previewDate.set(iso);
  }

  addAvailability(days: DayOfWeek[], block: AvailabilityBlock): Observable<AddAvailabilityResult> {
    return from(days).pipe(
      concatMap((day) =>
        this.api.addAvailability({ dayOfWeek: day, ...block }).pipe(
          map(() => ({ day, message: null })),
          catchError((error) =>
            of({
              day,
              message: apiErrorMessage(
                error,
                this.i18n.translate('availability.errors.saveSchedule'),
              ),
            }),
          ),
        ),
      ),
      toArray(),
      map((results) => ({
        saved: results.filter((r) => r.message === null).map((r) => r.day),
        failed: results.flatMap(({ day, message }) => (message === null ? [] : [{ day, message }])),
      })),
      tap(({ saved }) => {
        if (saved.length) {
          this.notifications.success(
            this.i18n.translate('availability.notifications.scheduleAdded'),
          );
        }
      }),
      finalize(() => this.reload()),
    );
  }

  removeAvailability(block: Availability, dayLabel: string): Observable<void> {
    const prefix = this.i18n.translate('availability.confirm.removeScheduleMessagePrefix');
    const fromWord = this.i18n.translate('availability.confirm.removeScheduleMessageFrom');
    const toWord = this.i18n.translate('availability.confirm.removeScheduleMessageTo');
    const suffix = this.i18n.translate('availability.confirm.removeScheduleMessageSuffix');

    return this.confirm
      .confirmThen(
        {
          title: this.i18n.translate('availability.confirm.removeScheduleTitle'),
          message: `${prefix} ${dayLabel.toLowerCase()} ${fromWord} ${formatTime(block.startTime)} ${toWord} ${formatTime(block.endTime)}${suffix}`,
          confirmLabel: this.i18n.translate('availability.confirm.removeLabel'),
          danger: true,
        },
        () => this.api.removeAvailability(block.id),
        this.i18n.translate('availability.notifications.scheduleRemoved'),
        this.i18n.translate('availability.errors.removeSchedule'),
      )
      .pipe(tap(() => this.reload()));
  }

  addException(request: Omit<ScheduleExceptionRequest, 'cancelAppointments'>): Observable<void> {
    return this.api.addException({ ...request, cancelAppointments: false }).pipe(
      map(() => this.i18n.translate('availability.notifications.scheduleBlocked')),
      catchError((error) => {
        const count = activeAppointmentsConflict(error);
        if (count === null) return throwError(() => error);
        return this.confirmCancelAppointments(count).pipe(
          switchMap(() => this.api.addException({ ...request, cancelAppointments: true })),
          map(() =>
            count === 1
              ? this.i18n.translate('availability.notifications.scheduleBlockedSingleCancelled')
              : this.i18n.translate('availability.notifications.scheduleBlockedMultipleCancelled'),
          ),
        );
      }),
      tap((message) => {
        this.notifications.success(message);
        this.reload();
      }),
      map(() => undefined),
    );
  }

  removeException(exception: ScheduleException): Observable<void> {
    const prefix = this.i18n.translate('availability.confirm.removeBlockMessagePrefix');
    return this.confirm
      .confirmThen(
        {
          title: this.i18n.translate('availability.confirm.removeBlockTitle'),
          message: `${prefix} ${formatLongDate(exception.date).toLowerCase()}?`,
          confirmLabel: this.i18n.translate('availability.confirm.removeLabel'),
        },
        () => this.api.removeException(exception.id),
        this.i18n.translate('availability.notifications.blockRemoved'),
        this.i18n.translate('availability.errors.removeException'),
      )
      .pipe(tap(() => this.reload()));
  }

  private confirmCancelAppointments(count: number): Observable<true> {
    const message =
      count === 1
        ? this.i18n.translate('availability.confirm.cancelAppointmentsSingle')
        : count > 1
          ? `${this.i18n.translate('availability.confirm.cancelAppointmentsMultiplePrefix')} ${count} ${this.i18n.translate('availability.confirm.cancelAppointmentsMultipleSuffix')}`
          : this.i18n.translate('availability.confirm.cancelAppointmentsGeneric');
    return this.confirm
      .ask({
        title: this.i18n.translate('availability.confirm.cancelAppointmentsTitle'),
        message,
        confirmLabel: this.i18n.translate('availability.confirm.cancelAppointmentsConfirm'),
        danger: true,
      })
      .pipe(switchMap((confirmed) => (confirmed ? [true as const] : EMPTY)));
  }
}
