package com.example.pulso.notification.event;

import java.time.LocalDateTime;
import java.util.Locale;

public record ClinicActivationEvent(
        Long clinicId,
        String clinicName,
        String adminName,
        String adminEmail,
        String token,
        LocalDateTime expiresAt,
        Locale locale
) {}
