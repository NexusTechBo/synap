package com.example.pulso.notification.template;

import com.example.pulso.notification.event.AppointmentNotificationEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class WhatsappTemplates {
    private final NotificationTexts texts;

    public String appointmentConfirmed(AppointmentNotificationEvent event) {
        return intro("notification.whatsapp.appointmentConfirmed", event) + "\n\n" + appointmentDetails(event);
    }

    public String appointmentCancelled(AppointmentNotificationEvent event) {
        var reason = StringUtils.hasText(event.cancellationReason())
                ? "\n\n" + texts.label(event.locale(), "reason") + ": " + event.cancellationReason().strip()
                : "";
        return intro("notification.whatsapp.appointmentCancelled", event) + "\n\n" + appointmentDetails(event) + reason;
    }

    public String appointmentRescheduled(AppointmentNotificationEvent event) {
        return intro("notification.whatsapp.appointmentRescheduled", event)
                + "\n\n" + appointmentDetails(event)
                + "\n\n" + texts.get(event.locale(), "notification.whatsapp.rescheduledPending");
    }

    private String intro(String key, AppointmentNotificationEvent event) {
        return texts.get(
                event.locale(),
                key,
                event.patientName(),
                texts.whatsappClinicLabel(event.clinicName(), event.locale()));
    }

    private String appointmentDetails(AppointmentNotificationEvent event) {
        var locale = event.locale();
        var details = new StringBuilder()
                .append(texts.label(locale, "doctor")).append(": ").append(event.doctorName()).append('\n');
        if (StringUtils.hasText(event.specialtyName()))
            details.append(texts.label(locale, "specialty")).append(": ").append(event.specialtyName()).append('\n');
        return details
                .append(texts.label(locale, "date")).append(": ").append(texts.formatDate(event.startTime(), locale))
                .append('\n')
                .append(texts.label(locale, "time")).append(": ")
                .append(texts.formatTimeRange(event.startTime(), event.endTime()))
                .toString();
    }
}
