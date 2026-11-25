package com.example.pulso.notification.listener;

import com.example.pulso.config.AsyncConfig;
import com.example.pulso.notification.NotificationChannel;
import com.example.pulso.notification.event.AppointmentNotificationEvent;
import com.example.pulso.notification.event.ClinicActivatedEvent;
import com.example.pulso.notification.event.ClinicActivationEvent;
import com.example.pulso.notification.event.StaffCreatedEvent;
import com.example.pulso.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.util.StringUtils;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmailNotificationListener {
    private final EmailService emailService;

    @Async(AsyncConfig.MAIL_TASK_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStaffCreated(StaffCreatedEvent event) {
        emailService.sendStaffCredentials(event);
    }

    @Async(AsyncConfig.MAIL_TASK_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onClinicActivation(ClinicActivationEvent event) {
        emailService.sendClinicActivation(event);
    }

    @Async(AsyncConfig.MAIL_TASK_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onClinicActivated(ClinicActivatedEvent event) {
        emailService.sendClinicWelcome(event);
    }

    @Async(AsyncConfig.MAIL_TASK_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAppointmentNotification(AppointmentNotificationEvent event) {

        if (!event.channels().contains(NotificationChannel.EMAIL)) return;

        if (!StringUtils.hasText(event.patientEmail())) {
            log.info("Appointment {} email notification skipped: patient has no email", event.appointmentId());
            return;
        }

        switch (event.type()) {
            case CONFIRMED -> emailService.sendAppointmentConfirmed(event);
            case CANCELLED -> emailService.sendAppointmentCancelled(event);
            case RESCHEDULED -> emailService.sendAppointmentRescheduled(event);
            case DOCTOR_GUEST_BOOKED -> emailService.sendDoctorGuestAppointment(event);
        }
    }
}
