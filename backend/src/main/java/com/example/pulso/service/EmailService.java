package com.example.pulso.service;

import com.example.pulso.notification.event.AppointmentNotificationEvent;
import com.example.pulso.notification.event.ClinicActivatedEvent;
import com.example.pulso.notification.event.ClinicActivationEvent;
import com.example.pulso.notification.event.StaffCreatedEvent;

public interface EmailService {
    void sendStaffCredentials(StaffCreatedEvent event);

    void sendAppointmentConfirmed(AppointmentNotificationEvent event);

    void sendAppointmentCancelled(AppointmentNotificationEvent event);

    void sendAppointmentRescheduled(AppointmentNotificationEvent event);

    void sendDoctorGuestAppointment(AppointmentNotificationEvent event);

    void sendClinicActivation(ClinicActivationEvent event);

    void sendClinicWelcome(ClinicActivatedEvent event);
}