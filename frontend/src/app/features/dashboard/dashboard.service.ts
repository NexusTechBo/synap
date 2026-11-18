import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AppointmentsApi } from '../../core/api/appointments.api';
import { ClinicClockService } from '../../core/clinic/clinic-clock.service';
import { resourceError } from '../../core/http/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppointmentSummaryItem } from '../../core/models/api.models';
import { appointmentStartDateTime } from '../../core/utils/appointment.util';
import {
  addDays,
  formatShortDate,
  formatWeekdayShort,
  parseIso,
  startOfWeek,
  toIso,
} from '../../core/utils/calendar.util';
import { AppointmentActionsService } from '../../shared/services/appointment-actions.service';
import { Kpi, WeekDayStats } from './dashboard.model';

const PENDING_LIMIT = 6;

@Injectable()
export class DashboardService {
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly actions = inject(AppointmentActionsService);
  private readonly i18n = inject(I18nService);
  private readonly clock = inject(ClinicClockService);
  private readonly today = this.clock.today();
  private readonly weekStart = startOfWeek(parseIso(this.today));

  private readonly locale = computed(() => this.i18n.intlLocale());

  private readonly weekResource = rxResource({
    stream: () =>
      this.appointmentsApi.board({
        from: toIso(this.weekStart),
        to: toIso(addDays(this.weekStart, 6)),
      }),
  });

  readonly isWeekLoading = this.weekResource.isLoading;
  readonly weekErrorMessage = resourceError(
    this.weekResource,
    this.i18n,
    this.i18n.translate('dashboard.errorLoad'),
  );

  readonly todayAppointments = computed<AppointmentSummaryItem[]>(() => {
    const board = this.weekResource.hasValue() ? this.weekResource.value() : undefined;
    if (!board) return [];
    return [...board.PENDING, ...board.CONFIRMED]
      .filter((appointment) => appointment.appointmentDate === this.today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  private readonly upcomingPending = computed<AppointmentSummaryItem[]>(() => {
    const board = this.weekResource.hasValue() ? this.weekResource.value() : undefined;
    if (!board) return [];
    return board.PENDING.filter((appointment) => appointment.appointmentDate >= this.today).sort(
      (a, b) =>
        a.appointmentDate.localeCompare(b.appointmentDate) ||
        a.startTime.localeCompare(b.startTime),
    );
  });
  readonly pendingCount = computed(() => this.upcomingPending().length);
  readonly pendingToConfirm = computed(() => {
    const locale = this.locale();
    return this.upcomingPending()
      .slice(0, PENDING_LIMIT)
      .map((appointment) => ({
        appointment,
        dayLabel:
          appointment.appointmentDate === this.today
            ? this.i18n.translate('dashboard.todayLabel')
            : formatShortDate(appointment.appointmentDate, locale),
      }));
  });

  readonly weekDays = computed<WeekDayStats[]>(() => {
    const locale = this.locale();
    const board = this.weekResource.hasValue() ? this.weekResource.value() : undefined;
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(this.weekStart, i);
      const iso = toIso(date);
      const count = (items: AppointmentSummaryItem[] | undefined) =>
        items?.filter((appointment) => appointment.appointmentDate === iso).length ?? 0;
      const confirmed = count(board?.CONFIRMED);
      const pending = count(board?.PENDING);
      const cancelled = count(board?.CANCELLED);
      return {
        iso,
        weekday: formatWeekdayShort(date, locale),
        day: date.getDate(),
        isToday: iso === this.today,
        confirmed,
        pending,
        cancelled,
        total: confirmed + pending + cancelled,
      };
    });
  });
  readonly weekTotal = computed(() => this.weekDays().reduce((sum, day) => sum + day.total, 0));

  readonly kpis = computed<Kpi[]>(() => {
    this.i18n.currentLang();
    const board = this.weekResource.hasValue() ? this.weekResource.value() : undefined;
    return [
      {
        label: this.i18n.translate('dashboard.kpis.todayAppointments'),
        value: board ? this.todayAppointments().length : null,
        icon: 'calendar',
        tone: 'bg-primary/10 text-primary',
      },
      {
        label: this.i18n.translate('dashboard.kpis.pendingWeek'),
        value: board?.PENDING.length ?? null,
        icon: 'clock',
        tone: 'bg-tertiary/10 text-tertiary',
      },
      {
        label: this.i18n.translate('dashboard.kpis.confirmedWeek'),
        value: board?.CONFIRMED.length ?? null,
        icon: 'check',
        tone: 'bg-secondary/10 text-secondary',
      },
      {
        label: this.i18n.translate('dashboard.kpis.cancelledWeek'),
        value: board?.CANCELLED.length ?? null,
        icon: 'block',
        tone: 'bg-gray-900/[0.06] text-gray-500',
      },
    ];
  });

  reload(): void {
    this.weekResource.reload();
  }

  open(appointment: AppointmentSummaryItem): void {
    this.actions.openDetail(appointment.id).subscribe(() => this.reload());
  }

  confirm(appointment: AppointmentSummaryItem): void {
    this.actions
      .confirm(appointment.id, appointment.clientName, appointmentStartDateTime(appointment))
      .subscribe(() => this.reload());
  }

  cancel(appointment: AppointmentSummaryItem): void {
    this.actions
      .cancel(appointment.id, appointment.clientName, appointmentStartDateTime(appointment))
      .subscribe(() => this.reload());
  }
}
