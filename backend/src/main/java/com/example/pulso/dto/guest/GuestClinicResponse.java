package com.example.pulso.dto.guest;

public record GuestClinicResponse(
        String name,
        String slug,
        String country,
        String timezone,
        String defaultLanguage
) {}
