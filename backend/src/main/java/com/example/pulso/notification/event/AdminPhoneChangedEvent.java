package com.example.pulso.notification.event;

public record AdminPhoneChangedEvent(
        Long clinicId,
        String previousPhoneNumber,
        String newPhoneNumber
) {}