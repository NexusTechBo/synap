import { I18nService } from '../../core/i18n/i18n.service';
import { PatientActiveAppointmentConflict } from '../../core/models/api.models';
import { datePart, formatLongDate, formatTime } from '../../core/utils/calendar.util';
import { ConfirmOptions } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { BookingAttempt } from './booking.model';

export function rescheduleConfirmOptions(
  conflict: PatientActiveAppointmentConflict,
  attempt: BookingAttempt,
  i18n: I18nService,
): ConfirmOptions {
  const locale = i18n.currentLang() === 'en' ? 'en-US' : 'es-ES';
  const status = i18n.translate(`statuses.${conflict.status}`).toLowerCase();
  const currentDate = formatLongDate(datePart(conflict.startTime), locale).toLowerCase();
  const newDate = formatLongDate(attempt.date, locale).toLowerCase();

  return {
    title: i18n.translate('booking.rescheduleConfirm.title'),
    message:
      `${attempt.patient.name} ${i18n.translate('booking.rescheduleConfirm.alreadyHas')} ${status} ` +
      `${i18n.translate('booking.rescheduleConfirm.withDoctor')} ${attempt.doctor.name} ` +
      `${i18n.translate('booking.rescheduleConfirm.onDate')} ${currentDate} ` +
      `${i18n.translate('booking.rescheduleConfirm.atTime')} ${formatTime(conflict.startTime)}. ` +
      `${i18n.translate('booking.rescheduleConfirm.questionPrefix')} ${newDate} ` +
      `${i18n.translate('booking.rescheduleConfirm.atTime')} ${formatTime(attempt.startDateTime)}?`,
    confirmLabel: i18n.translate('booking.rescheduleConfirm.confirmLabel'),
  };
}
