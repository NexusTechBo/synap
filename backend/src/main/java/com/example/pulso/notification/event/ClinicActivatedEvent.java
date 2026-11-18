package com.example.pulso.notification.event;

import java.util.Locale;

public record ClinicActivatedEvent(
        Long clinicId,
        String clinicName,
        String adminName,
        String adminEmail,
        String adminUsername,
        Locale locale
) {}
