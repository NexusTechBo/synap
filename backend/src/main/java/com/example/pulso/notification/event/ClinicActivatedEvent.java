package com.example.pulso.notification.event;

public record ClinicActivatedEvent(
        Long clinicId,
        String clinicName,
        String adminName,
        String adminEmail,
        String adminUsername
) {}
