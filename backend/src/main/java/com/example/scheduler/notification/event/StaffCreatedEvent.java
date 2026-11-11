package com.example.scheduler.notification.event;

import com.example.scheduler.enums.ERole;
import org.jspecify.annotations.NonNull;

public record StaffCreatedEvent(
        String email,
        String name,
        String username,
        String rawPassword,
        ERole role,
        String clinicName
) {}
