package com.example.pulso.notification.listener;

import com.example.pulso.config.AsyncConfig;
import com.example.pulso.notification.NotificationChannel;
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
    private final WhatsappTemplates whatsappTemplates;

    @Async(AsyncConfig.WHATSAPP_TASK_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAppointmentNotification(AppointmentNotificationEvent event) {

        if (!event.channels().contains(NotificationChannel.WHATSAPP)) return;

        var message = switch (event.type()) {
            case CONFIRMED -> whatsappTemplates.appointmentConfirmed(event);
            case CANCELLED -> whatsappTemplates.appointmentCancelled(event);
            case RESCHEDULED -> whatsappTemplates.appointmentRescheduled(event);
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
