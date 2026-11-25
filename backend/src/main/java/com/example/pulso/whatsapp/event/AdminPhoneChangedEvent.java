package com.example.pulso.whatsapp.event;

public record AdminPhoneChangedEvent(
        Long clinicId,
        String previousPhoneNumber,
        String newPhoneNumber
) {}
