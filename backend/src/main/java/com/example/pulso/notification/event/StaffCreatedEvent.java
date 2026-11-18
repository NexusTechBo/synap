package com.example.pulso.notification.event;

import com.example.pulso.enums.ERole;
import java.util.Locale;

public record StaffCreatedEvent(
        String email,
        String name,
        String username,
        String rawPassword,
        ERole role,
        String clinicName,
        Locale locale
) {}
