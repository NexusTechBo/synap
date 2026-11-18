package com.example.pulso.dto.clinic;

public record ClinicRegionalSettingsResponse(
        String country,
        String timezone,
        String defaultLanguage
) {}
