package com.example.pulso.notification;

import com.example.pulso.config.AsyncConfig;
import com.example.pulso.notification.event.AppointmentNotificationEvent;
import com.example.pulso.notification.template.WhatsappTemplates;
import com.example.pulso.service.WhatsappExchangeService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class WhatsappNotificationListener {
    private final WhatsappExchangeService whatsappExchangeService;

    @Async(AsyncConfig.WHATSAPP_TASK_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAppointmentNotification(AppointmentNotificationEvent event) {

        if (!event.channels().contains(NotificationChannel.WHATSAPP)) return;

        var message = switch (event.type()) {
            case CONFIRMED -> WhatsappTemplates.appointmentConfirmed(event);
            case CANCELLED -> WhatsappTemplates.appointmentCancelled(event);
            case RESCHEDULED -> WhatsappTemplates.appointmentRescheduled(event);
            case DOCTOR_GUEST_BOOKED -> null;
        };

        if (message == null) return;

        whatsappExchangeService.sendMessage(
                event.clinicSlug(),
                event.patientPhoneNumber(),
                message,
                "appointment=" + event.appointmentId() + " type=" + event.type() + " status=" + event.status()
        );
    }
}
